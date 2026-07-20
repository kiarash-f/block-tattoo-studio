import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as Sentry from '@sentry/nestjs';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    @Inject(CACHE_MANAGER) private readonly cache: any,
  ) {}

  /**
   * Short fingerprint of the CURRENT password hash, embedded as the `pwf`
   * claim at login and re-checked on every request. Rotating the password
   * hash (password change) therefore invalidates all previously issued
   * tokens immediately — a token-version mechanism without a schema change.
   */
  private passwordFingerprint(passwordHash: string): string {
    return crypto
      .createHash('sha256')
      .update(passwordHash)
      .digest('hex')
      .slice(0, 16);
  }

  async adminLogin(email: string, password: string) {
    const admin = await this.prisma.adminUser.findUnique({ where: { email } });
    if (!admin || !admin.isActive)
      throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    });

    const accessToken = await this.jwt.signAsync({
      sub: admin.id,
      role: 'ADMIN',
      email: admin.email,
      pwf: this.passwordFingerprint(admin.passwordHash),
    });

    return { accessToken };
  }

  /**
   * Per-request liveness check for an admin token (called by JwtStrategy):
   * the account must still exist, be active, and the token's `pwf` claim must
   * match the fingerprint of the CURRENT password hash. Deactivation and
   * password changes therefore kill existing tokens on their next use —
   * independent of the Redis blocklist, so it also holds when Redis is down.
   * Tokens issued before the `pwf` claim existed are rejected (one-time
   * forced re-login on deploy).
   */
  async assertTokenStillValid(payload: {
    sub: string;
    pwf?: string;
  }): Promise<void> {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
      select: { isActive: true, passwordHash: true },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }
    if (
      !payload.pwf ||
      payload.pwf !== this.passwordFingerprint(admin.passwordHash)
    ) {
      throw new UnauthorizedException('Token is no longer valid');
    }
  }

  async getMe(adminId: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        displayName: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!admin) throw new NotFoundException('Admin not found');
    return admin;
  }

  /**
   * Blocklist the token in Redis for the remainder of its lifetime. Failures
   * are LOUD: if the blocklist write fails or hangs (Redis unreachable), the
   * error goes to Sentry and the caller gets a 503 — logout must never report
   * success while the token remains usable. (Note node-redis queues commands
   * while reconnecting, so a hard timeout is required to avoid hanging.)
   */
  async revokeTokens(token: string) {
    const decoded = this.jwt.decode(token);
    if (!decoded?.exp) return; // not a well-formed JWT — nothing to revoke

    const ttlSeconds = decoded.exp - Math.floor(Date.now() / 1000);
    if (ttlSeconds <= 0) return; // already expired

    try {
      await this.withTimeout(
        this.cache.set(`blocklist:${token}`, '1', ttlSeconds * 1000),
        3000,
      );
    } catch (err) {
      Sentry.captureException(err, {
        tags: { area: 'auth', action: 'revoke-token' },
      });
      throw new ServiceUnavailableException(
        'Logout failed: token revocation store is unreachable. The token is still valid — retry logout.',
      );
    }
  }

  async isRevoked(token: string): Promise<boolean> {
    const val = await this.cache.get(`blocklist:${token}`);
    return val !== null && val !== undefined;
  }

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`Revocation store timeout after ${ms}ms`)),
          ms,
        ),
      ),
    ]);
  }
}

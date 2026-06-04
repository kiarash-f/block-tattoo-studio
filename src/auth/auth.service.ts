import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    @Inject(CACHE_MANAGER) private readonly cache: any,
  ) {}

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
    });

    return { accessToken };
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

  async revokeTokens(token: string) {
    try {
      const decoded = this.jwt.decode(token);
      if (!decoded?.exp) return;
      const ttlSeconds = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttlSeconds > 0) {
        await this.cache.set(`blocklist:${token}`, '1', ttlSeconds * 1000);
      }
    } catch {}
  }
  async isRevoked(token: string): Promise<boolean> {
    const val = await this.cache.get(`blocklist:${token}`);
    return val !== null && val !== undefined;
  }
}

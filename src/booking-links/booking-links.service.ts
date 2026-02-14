import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import * as crypto from 'crypto';
import * as argon2 from 'argon2';

type Scope = 'INTAKE_CONTINUE' | 'UPLOAD' | 'VIEW';

@Injectable()
export class BookingLinksService {
  private readonly pepper: string;
  private readonly publicBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.pepper = this.config.get<string>('BOOKING_LINK_TOKEN_PEPPER', '');
    this.publicBaseUrl = this.config.get<string>('PUBLIC_BASE_URL', '');
    if (!this.pepper || this.pepper.length < 32) {
      throw new Error('BOOKING_LINK_TOKEN_PEPPER is missing/too short');
    }
    if (!this.publicBaseUrl) {
      throw new Error('PUBLIC_BASE_URL is missing');
    }
  }
  private generateSecret(bytes = 32): string {
    return crypto
      .randomBytes(bytes)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }

  private async hashSecret(secret: string): Promise<string> {
    // Pepper makes stolen DB hashes harder to crack (server-secret)
    return argon2.hash(`${secret}:${this.pepper}`, {
      type: argon2.argon2id,
      memoryCost: 19456, // ~19MB (tune as you like)
      timeCost: 2,
      parallelism: 1,
    });
  }

  private async verifySecret(
    secret: string,
    secretHash: string,
  ): Promise<boolean> {
    return argon2.verify(secretHash, `${secret}:${this.pepper}`);
  }
  async createToken(params: {
    bookingRequestId: string;
    scopes: Scope[];
    expiresAt: Date;
    createdByAdminId?: string;
  }): Promise<{
    url: string;
    tokenId: string;
    expiresAt: Date;
    scopes: Scope[];
  }> {
    if (params.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('expiresAt must be in the future');
    }

    // Ensure booking exists
    const booking = await this.prisma.bookingRequest.findUnique({
      where: { id: params.bookingRequestId },
      select: { id: true },
    });
    if (!booking) throw new NotFoundException('BookingRequest not found');

    const secret = this.generateSecret(32);
    const secretHash = await this.hashSecret(secret);

    const token = await this.prisma.bookingLinkToken.create({
      data: {
        bookingRequestId: params.bookingRequestId,
        secretHash,
        scopes: params.scopes as any, // cast if Prisma enum typing differs
        expiresAt: params.expiresAt,
        // createdByAdminId: params.createdByAdminId ?? null, // enable if you added this field
      },
      select: { id: true, expiresAt: true, scopes: true },
    });

    const url = `${this.publicBaseUrl.replace(/\/+$/, '')}/public/booking/${token.id}.${secret}`;

    return {
      url,
      tokenId: token.id,
      expiresAt: token.expiresAt,
      scopes: token.scopes as any,
    };
  }
  async validateToken(compoundToken: string): Promise<{
    tokenId: string;
    bookingRequestId: string;
    scopes: Scope[];
  }> {
    const [tokenId, secret] = compoundToken.split('.', 2);
    if (!tokenId || !secret)
      throw new BadRequestException('Invalid token format');

    const token = await this.prisma.bookingLinkToken.findUnique({
      where: { id: tokenId },
      select: {
        id: true,
        bookingRequestId: true,
        secretHash: true,
        scopes: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!token) throw new NotFoundException('Token not found');

    if (token.status !== 'ACTIVE')
      throw new BadRequestException(`Token is not active (${token.status})`);
    if (token.expiresAt.getTime() <= Date.now())
      throw new BadRequestException('Token expired');

    const ok = await this.verifySecret(secret, token.secretHash);
    if (!ok) throw new BadRequestException('Invalid token secret');

    // record usage (non-blocking is nice, but keep it simple for now)
    await this.prisma.bookingLinkToken.update({
      where: { id: token.id },
      data: { lastUsedAt: new Date(), useCount: { increment: 1 } },
    });

    return {
      tokenId: token.id,
      bookingRequestId: token.bookingRequestId,
      scopes: token.scopes as any,
    };
  }
}

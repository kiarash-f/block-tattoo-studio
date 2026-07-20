import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from './auth.service';

export type AdminJwtPayload = {
  sub: string;
  email: string;
  role: 'ADMIN';
  /** Fingerprint of the password hash at issue time (see AuthService). */
  pwf?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly auth: AuthService,
  ) {
    const secret = config.get<string>('ADMIN_JWT_SECRET');
    if (!secret) {
      throw new Error('Missing ADMIN_JWT_SECRET');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: AdminJwtPayload) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (token && (await this.auth.isRevoked(token))) {
      throw new UnauthorizedException('Token has been revoked');
    }
    // Rejects deactivated accounts and tokens issued before the last password
    // change, regardless of Redis availability.
    await this.auth.assertTokenStillValid(payload);
    return payload;
  }
}

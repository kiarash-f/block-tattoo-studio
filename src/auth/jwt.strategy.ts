import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export type AdminJwtPayload = {
  sub: string;
  email: string;
  role: 'ADMIN';
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const secret = config.get<string>('ADMIN_JWT_SECRET');
    if (!secret) {
      throw new Error('Missing ADMIN_JWT_SECRET');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret, // ✅ guaranteed string
    });
  }

  validate(payload: AdminJwtPayload) {
    return payload; // becomes req.user
  }
}

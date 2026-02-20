import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KioskKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest();
    const key = req.headers['x-studio-kiosk-key'] as string | undefined;

    const expected = this.config.get<string>('STUDIO_KIOSK_KEY', '');
    if (!expected) throw new Error('STUDIO_KIOSK_KEY missing');

    if (!key || key !== expected) {
      throw new UnauthorizedException('Invalid kiosk key');
    }
    console.log('HEADER RECEIVED:', req.headers['x-studio-kiosk-key']);
    console.log('ENV VALUE:', this.config.get('STUDIO_KIOSK_KEY'));

    return true;
  }
}

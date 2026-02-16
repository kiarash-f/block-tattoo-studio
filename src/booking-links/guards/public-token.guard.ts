import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { BookingLinksService } from '../booking-links.service';
import { Observable } from 'rxjs';

@Injectable()
export class PublicTokenGuard implements CanActivate {
  constructor(private readonly bookingLinks: BookingLinksService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const raw = req.params?.token;

    if (!raw || Array.isArray(raw)) {
      throw new UnauthorizedException('Invalid token');
    }

    const compoundToken = raw; // now guaranteed string

    try {
      const validated = await this.bookingLinks.validateToken(compoundToken);
      req.publicToken = validated;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}

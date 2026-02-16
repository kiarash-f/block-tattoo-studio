import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { TOKEN_SCOPES_KEY } from '../decorators/token-scopes.decorator';
import type { BookingLinkScope } from '../public-token.types';

@Injectable()
export class TokenScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<BookingLinkScope[]>(
      TOKEN_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!required || required.length === 0) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const ctx = req.publicToken;

    if (!ctx) throw new ForbiddenException('Missing token context');

    const hasAll = required.every((s) => ctx.scopes.includes(s));
    if (!hasAll) throw new ForbiddenException('Insufficient token scope');

    return true;
  }
}

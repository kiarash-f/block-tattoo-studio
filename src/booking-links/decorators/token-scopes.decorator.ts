import { SetMetadata } from '@nestjs/common';
import type { BookingLinkScope } from '../public-token.types';

export const TOKEN_SCOPES_KEY = 'token_scopes';

export const TokenScopes = (...scopes: BookingLinkScope[]) =>
  SetMetadata(TOKEN_SCOPES_KEY, scopes);

import type { BookingLinkScope } from '../public-token.types';
export declare const TOKEN_SCOPES_KEY = "token_scopes";
export declare const TokenScopes: (...scopes: BookingLinkScope[]) => import("@nestjs/common").CustomDecorator<string>;

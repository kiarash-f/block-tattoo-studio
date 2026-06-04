"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenScopes = exports.TOKEN_SCOPES_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.TOKEN_SCOPES_KEY = 'token_scopes';
const TokenScopes = (...scopes) => (0, common_1.SetMetadata)(exports.TOKEN_SCOPES_KEY, scopes);
exports.TokenScopes = TokenScopes;
//# sourceMappingURL=token-scopes.decorator.js.map
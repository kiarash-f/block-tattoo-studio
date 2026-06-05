import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from './auth.service';
export type AdminJwtPayload = {
    sub: string;
    email: string;
    role: 'ADMIN';
};
declare const JwtStrategy_base: new (...args: [opt: import("passport-jwt").StrategyOptionsWithRequest] | [opt: import("passport-jwt").StrategyOptionsWithoutRequest]) => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly auth;
    constructor(config: ConfigService, auth: AuthService);
    validate(req: Request, payload: AdminJwtPayload): Promise<AdminJwtPayload>;
}
export {};

import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private prisma;
    private jwt;
    private readonly cache;
    constructor(prisma: PrismaService, jwt: JwtService, cache: any);
    adminLogin(email: string, password: string): Promise<{
        accessToken: string;
    }>;
    getMe(adminId: string): Promise<{
        id: string;
        email: string;
        displayName: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
    }>;
    revokeTokens(token: string): Promise<void>;
    isRevoked(token: string): Promise<boolean>;
}

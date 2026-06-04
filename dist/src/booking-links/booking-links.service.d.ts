import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
type Scope = 'INTAKE_CONTINUE' | 'UPLOAD' | 'VIEW';
export declare class BookingLinksService {
    private readonly prisma;
    private readonly config;
    private readonly pepper;
    private readonly publicBaseUrl;
    constructor(prisma: PrismaService, config: ConfigService);
    private generateSecret;
    private hashSecret;
    private verifySecret;
    createToken(params: {
        bookingRequestId: string;
        scopes: Scope[];
        expiresAt: Date;
        createdByAdminId?: string;
    }): Promise<{
        url: string;
        tokenId: string;
        expiresAt: Date;
        scopes: Scope[];
    }>;
    validateToken(compoundToken: string): Promise<{
        tokenId: string;
        bookingRequestId: string;
        scopes: Scope[];
    }>;
}
export {};

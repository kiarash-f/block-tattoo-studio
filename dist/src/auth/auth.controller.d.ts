import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
export declare class AuthController {
    private auth;
    constructor(auth: AuthService);
    adminLogin(dto: AdminLoginDto): Promise<{
        accessToken: string;
    }>;
    getMe(req: any): Promise<{
        id: string;
        email: string;
        displayName: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
    }>;
    logout(authHeader: string): Promise<{
        message: string;
    } | undefined>;
}

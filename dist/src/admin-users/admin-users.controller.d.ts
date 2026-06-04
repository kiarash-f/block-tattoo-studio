import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { ListAdminUsersDto } from './dto/list-admin-users.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';
export declare class AdminUsersController {
    private readonly service;
    constructor(service: AdminUsersService);
    seed(dto: CreateAdminUserDto): Promise<{
        id: string;
        email: string;
        displayName: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    create(dto: CreateAdminUserDto): Promise<{
        id: string;
        email: string;
        displayName: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    list(query: ListAdminUsersDto): Promise<{
        id: string;
        email: string;
        displayName: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        email: string;
        displayName: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    update(id: string, dto: UpdateAdminUserDto): Promise<{
        id: string;
        email: string;
        displayName: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    deactivate(id: string): Promise<{
        id: string;
        email: string;
        displayName: string | null;
        isActive: boolean;
        lastLoginAt: Date | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    changePassword(id: string, dto: ChangePasswordDto): Promise<{
        message: string;
    }>;
}

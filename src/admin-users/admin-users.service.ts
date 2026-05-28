import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ListAdminUsersDto } from './dto/list-admin-users.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

const SAFE_SELECT = {
  id: true,
  email: true,
  displayName: true,
  isActive: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
};
@Injectable()
export class AdminUsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAdminUserDto) {
    const existing = await this.prisma.adminUser.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    return this.prisma.adminUser.create({
      data: {
        email: dto.email,
        passwordHash,
        displayName: dto.displayName ?? null,
      },
      select: SAFE_SELECT,
    });
  }

  async list(query: ListAdminUsersDto) {
    const where =
      query.isActive !== undefined ? { isActive: query.isActive } : {};
    return this.prisma.adminUser.findMany({
      where,
      select: SAFE_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }
  async findOne(id: string) {
    const admin = await this.prisma.adminUser.findUnique({
      where: { id },
      select: SAFE_SELECT,
    });
    if (!admin) {
      throw new NotFoundException('Admin user not found');
    }
    return admin;
  }

  async update(id: string, dto: UpdateAdminUserDto) {
    await this.findOne(id);

    if (dto.email) {
      const conflict = await this.prisma.adminUser.findUnique({
        where: { email: dto.email },
      });
      if (conflict && conflict.id !== id) {
        throw new ConflictException('Email already in use');
      }

      return this.prisma.adminUser.update({
        where: { id },
        data: dto,
        select: SAFE_SELECT,
      });
    }
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.adminUser.update({
      where: { id },
      data: { isActive: false },
      select: SAFE_SELECT,
    });
  }

  async changePassword(id: string, dto: ChangePasswordDto) {
    const admin = await this.prisma.adminUser.findUnique({ where: { id } });
    if (!admin) throw new NotFoundException('Admin user not found');

    const valid = await bcrypt.compare(dto.currentPassword, admin.passwordHash);
    if (!valid)
      throw new UnauthorizedException('Current password is incorrect');

    if (dto.currentPassword === dto.newPassword)
      throw new BadRequestException(
        'New password must be different from current password',
      );

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.adminUser.update({
      where: { id },
      data: { passwordHash },
    });
    return { message: 'Password changed successfully' };
  }

  // Bootstrap: only works when zero admin accounts exist
  async seed(dto: CreateAdminUserDto) {
    const count = await this.prisma.adminUser.count();
    if (count > 0)
      throw new BadRequestException(
        'Admin account already exists. Use the create endpoint.',
      );
    return this.create(dto);
  }
}

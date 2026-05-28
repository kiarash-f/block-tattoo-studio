import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminUsersService } from './admin-users.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';
import { ListAdminUsersDto } from './dto/list-admin-users.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateAdminUserDto } from './dto/update-admin-user.dto';

// ── Unauthenticated bootstrap (first-run only) ────────────────────────────────

ApiTags('Admin / Users');
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly service: AdminUsersService) {}

  @Post('seed')
  @ApiOperation({
    summary: 'First-time admin setup',
    description:
      'Creates the first admin account. Fails with 400 if any admin already exists. ' +
      'Remove or protect this endpoint after first deployment.',
  })
  @ApiResponse({ status: 201, description: 'Admin user created.' })
  @ApiResponse({ status: 400, description: 'Admin user already exists.' })
  seed(@Body() dto: CreateAdminUserDto) {
    return this.service.seed(dto);
  }

  // ── All routes below require a valid admin JWT ──────────────────────────────

  @Post()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({ summary: 'Create New Admin User' })
  @ApiResponse({ status: 201, description: 'Admin user created.' })
  @ApiResponse({ status: 409, description: 'Email already in use.' })
  create(@Body() dto: CreateAdminUserDto) {
    return this.service.create(dto);
  }

  @Get()
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'List all admin users',
    description: 'Optionally filter by isActive status.',
  })
  @ApiResponse({ status: 200, description: 'List of admin users returned.' })
  list(@Query() query: ListAdminUsersDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({ summary: 'Get a single admin user' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Admin found.' })
  @ApiResponse({ status: 404, description: 'Admin not found.' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({ summary: 'Update admin Email or Display Name' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Admin updated.' })
  update(@Param('id') id: string, @Body() dto: UpdateAdminUserDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/deactivate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({ summary: 'Deactivate an admin user' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 200, description: 'Admin deactivated.' })
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }

  @Post(':id/change-password')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({ summary: 'Change an admin user password' })
  @ApiParam({ name: 'id' })
  @ApiResponse({ status: 201, description: 'Password changed.' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect.' })
  changePassword(@Param('id') id: string, @Body() dto: ChangePasswordDto) {
    return this.service.changePassword(id, dto);
  }
}

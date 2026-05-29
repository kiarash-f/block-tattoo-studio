import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60 } })
  @Post('admin/login')
  @ApiOperation({
    summary: 'Admin login',
    description: 'Authenticate as admin and receive a JWT token.',
  })
  @ApiResponse({
    status: 201,
    description: 'Login successful. Returns JWT token.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.auth.adminLogin(dto.email, dto.password);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('admin/me')
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Get current admin',
    description: 'Returns the profile of the currently authenticated admin.',
  })
  @ApiResponse({ status: 200, description: 'Admin profile.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  getMe(@Req() req: any) {
    return this.auth.getMe(req.user.sub as string);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('admin/logout')
  @HttpCode(200)
  @ApiBearerAuth('admin-jwt')
  @ApiOperation({
    summary: 'Admin logout',
    description: 'Logged out successfully.',
  })
  @ApiResponse({ status: 200, description: 'Logged out successfully.' })
  async logout(@Headers('authorization') authHeader: string) {
    const token = authHeader?.replace('Bearer ', '').trim();
    if (token) {
      return { message: 'Logged out successfully.' };
    }
  }
}

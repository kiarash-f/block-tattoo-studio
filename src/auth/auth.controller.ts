import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Throttle({ default: { limit: 10, ttl: 60 } })
  @Post('admin/login')
  @ApiOperation({ summary: 'Admin login', description: 'Authenticate as admin and receive a JWT token.' })
  @ApiResponse({ status: 201, description: 'Login successful. Returns JWT token.' })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.auth.adminLogin(dto.email, dto.password);
  }
}

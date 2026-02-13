import { Module } from '@nestjs/common';
import { AdminUsersService } from './admin-users.service';

@Module({
  providers: [AdminUsersService]
})
export class AdminUsersModule {}

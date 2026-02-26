import { Module } from '@nestjs/common';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { PublicController } from './public/public.controller';
import { PublicService } from './public/public.service';

@Module({
  controllers: [AdminController, PublicController],
  providers: [AdminService, PublicService]
})
export class WorksModule {}

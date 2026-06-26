import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SessionWindowService } from './session-window.service';

/**
 * Provides the shared SessionWindowService (window validation + per-artist
 * collision check). Imported by both BookingsModule (schedule-tattoo, walk-in)
 * and SchedulingModule (session edit) so the two paths share one implementation.
 */
@Module({
  imports: [PrismaModule],
  providers: [SessionWindowService],
  exports: [SessionWindowService],
})
export class SessionWindowModule {}

import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

// Exempt from the global ThrottlerGuard: orchestrator liveness probes must
// never be answered with 429.
@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { ok: true };
  }
}

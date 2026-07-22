import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

// Exempt from the global ThrottlerGuard: orchestrator liveness probes must
// never be answered with 429.
@SkipThrottle()
@Controller('health')
export class HealthController {
  private static readonly PROBE_TIMEOUT_MS = 1000;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  // Actively probes DB + Redis so the orchestrator stops routing traffic to an
  // instance whose dependencies are gone (M8). 503 if either is unreachable.
  @Get()
  async health() {
    const [db, redis] = await Promise.all([this.checkDb(), this.checkRedis()]);

    if (!db || !redis) {
      throw new ServiceUnavailableException({
        status: 'error',
        db: db ? 'up' : 'down',
        redis: redis ? 'up' : 'down',
      });
    }

    return { status: 'ok', db: 'up', redis: 'up' };
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.withTimeout(this.prisma.$queryRaw`SELECT 1`);
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      // Round-trip write→read: the cache is configured with
      // throwOnConnectError:false, so a dead Redis returns undefined rather
      // than throwing — only a value that survives the round-trip proves it.
      const key = `health:${crypto.randomUUID()}`;
      const token = crypto.randomUUID();
      await this.withTimeout(this.cache.set(key, token, 5000));
      const got = await this.withTimeout(this.cache.get<string>(key));
      return got === token;
    } catch {
      return false;
    }
  }

  private withTimeout<T>(p: Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error('health probe timeout')),
        HealthController.PROBE_TIMEOUT_MS,
      );
    });
    // clearTimeout on settle so a fast probe leaves no dangling timer.
    return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
  }
}

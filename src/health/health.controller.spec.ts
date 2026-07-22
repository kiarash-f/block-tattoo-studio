import { ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';

/**
 * M8 — /health actively probes DB + Redis and returns 503 when either is down.
 * The whole point is that it can NOT silently regress to always-ok, so these
 * tests assert it throws (503) rather than returning a 200 body whenever a
 * dependency is unreachable.
 */
async function createController(opts: {
  dbUp: boolean;
  redisUp: boolean;
}) {
  const prisma = {
    $queryRaw: jest.fn(() =>
      opts.dbUp ? Promise.resolve([{ '?column?': 1 }]) : Promise.reject(new Error('db down')),
    ),
  };

  // Redis probe is a write→read round-trip: "up" echoes back the stored token;
  // "down" returns undefined (the throwOnConnectError:false behaviour).
  let stored: unknown;
  const cache = {
    set: jest.fn((_key: string, value: unknown) => {
      stored = value;
      return Promise.resolve();
    }),
    get: jest.fn(() =>
      Promise.resolve(opts.redisUp ? stored : undefined),
    ),
  };

  const module: TestingModule = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [
      { provide: PrismaService, useValue: prisma },
      { provide: CACHE_MANAGER, useValue: cache },
    ],
  }).compile();

  return {
    controller: module.get<HealthController>(HealthController),
    prisma,
    cache,
  };
}

describe('HealthController (M8)', () => {
  it('returns ok when both DB and Redis are up', async () => {
    const { controller } = await createController({ dbUp: true, redisUp: true });
    await expect(controller.health()).resolves.toEqual({
      status: 'ok',
      db: 'up',
      redis: 'up',
    });
  });

  it('throws 503 (not 200) when the DB is down', async () => {
    const { controller } = await createController({
      dbUp: false,
      redisUp: true,
    });
    await expect(controller.health()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(controller.health()).rejects.toMatchObject({
      response: { status: 'error', db: 'down', redis: 'up' },
    });
  });

  it('throws 503 (not 200) when Redis is down', async () => {
    const { controller } = await createController({
      dbUp: true,
      redisUp: false,
    });
    await expect(controller.health()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(controller.health()).rejects.toMatchObject({
      response: { status: 'error', db: 'up', redis: 'down' },
    });
  });
});

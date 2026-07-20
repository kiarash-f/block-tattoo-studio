import 'reflect-metadata';
import { Controller, Get, INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';

// Proves the C1 fix: a globally-registered ThrottlerGuard (APP_GUARD +
// ThrottlerModule.forRoot) actually enforces the limit — the request past the
// limit gets 429. The regression that shipped was decorators present but no
// guard registered, so nothing was ever enforced.
describe('Rate limiting (C1)', () => {
  const LIMIT = 3;

  @Controller('ping')
  class PingController {
    @Get()
    ping() {
      return { ok: true };
    }
  }

  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: LIMIT }])],
      controllers: [PingController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it(`allows ${LIMIT} requests then returns 429 on request ${LIMIT + 1}`, async () => {
    for (let i = 0; i < LIMIT; i++) {
      await request(app.getHttpServer()).get('/ping').expect(200);
    }
    await request(app.getHttpServer()).get('/ping').expect(429);
  });
});

import { Test } from '@nestjs/testing';

import { HealthController } from './health.controller.js';
import { AppException } from '../common/errors/app.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RedisService } from '../redis/redis.service.js';

/** Заглушка базы: в ESM-режиме Jest глобальный `jest.fn` недоступен — считаем вызовы сами. */
const database = {
  up: true,
  calls: 0,
  isReady(): Promise<boolean> {
    this.calls++;
    return Promise.resolve(this.up);
  },
};

/** Заглушка Redis — так же. */
const redis = {
  up: true,
  calls: 0,
  isReady(): Promise<boolean> {
    this.calls++;
    return Promise.resolve(this.up);
  },
};

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    database.up = true;
    database.calls = 0;
    redis.up = true;
    redis.calls = 0;
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: database },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it('живость не зависит от базы и Redis', () => {
    expect(controller.check()).toEqual({ status: 'ok' });
    expect(database.calls).toBe(0);
    expect(redis.calls).toBe(0);
  });

  it('готовность: база и Redis доступны → ok', async () => {
    await expect(controller.ready()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'ok', redis: 'ok' },
    });
  });

  it('готовность: Redis недоступен → 503 not_ready', async () => {
    redis.up = false;
    const error: unknown = await controller.ready().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).getStatus()).toBe(503);
    expect((error as AppException).code).toBe('not_ready');
    expect((error as AppException).message).toBe('Redis unavailable');
  });

  it('готовность: база недоступна → 503 not_ready', async () => {
    database.up = false;
    const error: unknown = await controller.ready().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).getStatus()).toBe(503);
    expect((error as AppException).code).toBe('not_ready');
  });
});

import { Test } from '@nestjs/testing';

import { HealthController } from './health.controller.js';
import { AppException } from '../common/errors/app.exception.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** Заглушка базы: в ESM-режиме Jest глобальный `jest.fn` недоступен — считаем вызовы сами. */
const database = {
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
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: database }],
    }).compile();
    controller = moduleRef.get(HealthController);
  });

  it('живость не зависит от базы', () => {
    expect(controller.check()).toEqual({ status: 'ok' });
    expect(database.calls).toBe(0);
  });

  it('готовность: база доступна → ok', async () => {
    await expect(controller.ready()).resolves.toEqual({
      status: 'ok',
      checks: { database: 'ok' },
    });
  });

  it('готовность: база недоступна → 503 not_ready', async () => {
    database.up = false;
    const error: unknown = await controller.ready().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).getStatus()).toBe(503);
    expect((error as AppException).code).toBe('not_ready');
  });
});

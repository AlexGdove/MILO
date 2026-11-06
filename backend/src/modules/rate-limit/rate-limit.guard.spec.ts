import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RateLimit, SkipGlobalRateLimit } from './rate-limit.decorator.js';
import { deviceTracker, ipTracker, rateLimitKey, RateLimitGuard } from './rate-limit.guard.js';
import { RATE_LIMIT_POLICIES } from './rate-limit.policies.js';
import type { RateLimitHit, RedisRateLimitStorage } from './rate-limit.storage.js';
import { AppException } from '../../common/errors/app.exception.js';

/** Заглушка хранилища: запоминает ключи, отвечает заданным результатом или ошибкой. */
class StorageStub {
  keys: string[] = [];
  result: RateLimitHit | Error = { hits: 1, retryAfterMs: 1000, blocked: false };

  hit(key: string): Promise<RateLimitHit> {
    this.keys.push(key);
    return this.result instanceof Error
      ? Promise.reject(this.result)
      : Promise.resolve(this.result);
  }
}

class Routes {
  plain() {}

  @RateLimit('deviceKeyIssue')
  limited() {}

  @SkipGlobalRateLimit()
  health() {}
}

function contextFor(handler: keyof Routes, req: object, headers: Record<string, unknown>) {
  return {
    getHandler: () => Routes.prototype[handler],
    getClass: () => Routes,
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({ setHeader: (name: string, value: unknown) => (headers[name] = value) }),
    }),
  } as unknown as ExecutionContext;
}

const REQ = { ip: '203.0.113.7', headers: {} };

describe('RateLimitGuard', () => {
  let storage: StorageStub;
  let guard: RateLimitGuard;
  let headers: Record<string, unknown>;

  beforeEach(() => {
    storage = new StorageStub();
    guard = new RateLimitGuard(storage as unknown as RedisRateLimitStorage, new Reflector());
    headers = {};
  });

  it('обычный маршрут — только общий лимит', async () => {
    await expect(guard.canActivate(contextFor('plain', REQ, headers))).resolves.toBe(true);
    expect(storage.keys).toEqual([rateLimitKey('all', RATE_LIMIT_POLICIES.all, REQ)]);
  });

  it('маршрут с @RateLimit — общий лимит и лимит действия', async () => {
    await guard.canActivate(contextFor('limited', REQ, headers));
    expect(storage.keys).toEqual([
      rateLimitKey('all', RATE_LIMIT_POLICIES.all, REQ),
      rateLimitKey('deviceKeyIssue', RATE_LIMIT_POLICIES.deviceKeyIssue, REQ),
    ]);
  });

  it('@SkipGlobalRateLimit — без счётчиков', async () => {
    await guard.canActivate(contextFor('health', REQ, headers));
    expect(storage.keys).toEqual([]);
  });

  it('превышение → 429 rate_limited и Retry-After в секундах (округление вверх)', async () => {
    storage.result = { hits: 6, retryAfterMs: 1500, blocked: true };
    const error: unknown = await guard
      .canActivate(contextFor('plain', REQ, headers))
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).getStatus()).toBe(429);
    expect((error as AppException).code).toBe('rate_limited');
    expect(headers['Retry-After']).toBe(2);
  });

  it('Redis недоступен → 503 service_unavailable (запрос не пропускается)', async () => {
    storage.result = new Error('Command timed out');
    const error: unknown = await guard
      .canActivate(contextFor('plain', REQ, headers))
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AppException);
    expect((error as AppException).getStatus()).toBe(503);
    expect((error as AppException).code).toBe('service_unavailable');
  });
});

describe('трекеры лимитов', () => {
  it('IP — нормализованный адрес', () => {
    expect(ipTracker({ ip: '::ffff:203.0.113.7', headers: {} })).toBe('ip:203.0.113.7');
  });

  it('ключ устройства — хэш вместо самого ключа; без ключа — IP', () => {
    const key = `mk_${'a'.repeat(43)}`;
    const tracker = deviceTracker({ ip: '203.0.113.7', headers: { 'x-device-key': key } });
    expect(tracker).toMatch(/^dk:[0-9a-f]{64}$/);
    expect(tracker).not.toContain(key);
    expect(deviceTracker({ ip: '203.0.113.7', headers: {} })).toBe('ip:203.0.113.7');
  });

  it('ключ счётчика не зависит от маршрута, но разный у разных действий', () => {
    expect(rateLimitKey('productSubmit', RATE_LIMIT_POLICIES.productSubmit, REQ)).toBe(
      rateLimitKey('productSubmit', RATE_LIMIT_POLICIES.productSubmit, REQ),
    );
    expect(rateLimitKey('productSubmit', RATE_LIMIT_POLICIES.productSubmit, REQ)).not.toBe(
      rateLimitKey('ticketCreate', RATE_LIMIT_POLICIES.ticketCreate, REQ),
    );
  });
});

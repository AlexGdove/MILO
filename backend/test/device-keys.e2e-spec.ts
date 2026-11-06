import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { resetData } from './support/db.js';
import { resetRedis } from './support/redis.js';
import { CurrentDeviceKey, DeviceKeyGuard } from '../src/modules/device-keys/device-key.guard.js';
import { hashDeviceKey } from '../src/modules/device-keys/device-key.js';
import { DeviceKeysModule } from '../src/modules/device-keys/device-keys.module.js';
import type { DeviceKeyIdentity } from '../src/modules/device-keys/device-keys.service.js';
import { RATE_LIMIT_POLICIES } from '../src/modules/rate-limit/rate-limit.policies.js';
import { RedisRateLimitStorage } from '../src/modules/rate-limit/rate-limit.storage.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RedisService } from '../src/redis/redis.service.js';

/** Маршруты только для теста: guard на чтении и на записи. */
@Controller('test-guarded')
@UseGuards(DeviceKeyGuard)
class GuardedTestController {
  @Get()
  read(@CurrentDeviceKey() deviceKey: DeviceKeyIdentity) {
    return deviceKey;
  }

  @Post()
  write(@CurrentDeviceKey() deviceKey: DeviceKeyIdentity) {
    return deviceKey;
  }
}

const KEY = /^mk_[A-Za-z0-9_-]{43}$/;
const ISSUE_LIMIT = RATE_LIMIT_POLICIES.deviceKeyIssue.limit;

/** Ключ устройства и лимиты на реальных PostgreSQL (milo_test) и Redis (база 1). */
describe('Ключ устройства и лимиты (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let redis: RedisService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, DeviceKeysModule],
      controllers: [GuardedTestController],
    }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS);
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    redis = app.get(RedisService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetData(prisma);
    await resetRedis(redis);
  });

  const server = () => app.getHttpServer();
  const issueKey = async (): Promise<string> => {
    const res = await request(server()).post('/api/v1/device-keys').expect(201);
    return (res.body as { key: string }).key;
  };

  describe('POST /api/v1/device-keys', () => {
    it('выдаёт ключ; в базе только его SHA-256', async () => {
      const key = await issueKey();
      expect(key).toMatch(KEY);

      const rows = await prisma.deviceKey.findMany();
      expect(rows).toHaveLength(1);
      expect(rows[0]?.keyHash).toBe(hashDeviceKey(key));
      expect(rows[0]?.keyHash).not.toContain(key.slice(3));
      expect(rows[0]?.blockedAt).toBeNull();
    });

    it('каждый раз новый ключ', async () => {
      expect(await issueKey()).not.toBe(await issueKey());
    });

    it(`${ISSUE_LIMIT + 1}-й запрос за час с одного IP → 429 rate_limited и Retry-After`, async () => {
      for (let i = 0; i < ISSUE_LIMIT; i++) await issueKey();
      const res = await request(server()).post('/api/v1/device-keys').expect(429);
      expect(res.body.error.code).toBe('rate_limited');
      expect(typeof res.body.error.requestId).toBe('string');
      const retryAfter = Number(res.headers['retry-after']);
      expect(retryAfter).toBeGreaterThan(3500);
      expect(retryAfter).toBeLessThanOrEqual(3600);
      // Отклонённый запрос ключ не создаёт
      expect(await prisma.deviceKey.count()).toBe(ISSUE_LIMIT);
    });

    it('без доверенного прокси X-Forwarded-For не обходит лимит', async () => {
      for (let i = 0; i < ISSUE_LIMIT; i++) {
        await request(server())
          .post('/api/v1/device-keys')
          .set('X-Forwarded-For', `198.51.100.${i}`)
          .expect(201);
      }
      await request(server())
        .post('/api/v1/device-keys')
        .set('X-Forwarded-For', '198.51.100.250')
        .expect(429);
    });

    it('лимит действует на действие, а не мешает другим маршрутам', async () => {
      for (let i = 0; i < ISSUE_LIMIT; i++) await issueKey();
      await request(server()).post('/api/v1/device-keys').expect(429);
      await request(server()).get('/api/v1/health').expect(200);
      await request(server()).get('/api/v1/nope').expect(404);
    });
  });

  describe('DeviceKeyGuard', () => {
    it('без заголовка → 401 device_key_required', async () => {
      const res = await request(server()).get('/api/v1/test-guarded').expect(401);
      expect(res.body.error.code).toBe('device_key_required');
    });

    it.each([
      ['неверный формат', 'not-a-key'],
      ['неизвестный ключ', `mk_${'A'.repeat(43)}`],
    ])('%s → 401 device_key_invalid', async (_name, key) => {
      const res = await request(server()).get('/api/v1/test-guarded').set('X-Device-Key', key);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('device_key_invalid');
    });

    it('верный ключ → устройство в запросе, last_seen_at обновлён', async () => {
      const key = await issueKey();
      const res = await request(server())
        .get('/api/v1/test-guarded')
        .set('X-Device-Key', key)
        .expect(200);
      const row = await prisma.deviceKey.findUniqueOrThrow({
        where: { keyHash: hashDeviceKey(key) },
      });
      expect(res.body).toEqual({ id: row.id, blocked: false });
      expect(row.lastSeenAt).not.toBeNull();
    });

    it('заблокированный ключ: чтение можно, запись → 403 device_key_blocked', async () => {
      const key = await issueKey();
      await prisma.deviceKey.update({
        where: { keyHash: hashDeviceKey(key) },
        data: { blockedAt: new Date() },
      });

      const read = await request(server())
        .get('/api/v1/test-guarded')
        .set('X-Device-Key', key)
        .expect(200);
      expect(read.body.blocked).toBe(true);

      const write = await request(server())
        .post('/api/v1/test-guarded')
        .set('X-Device-Key', key)
        .expect(403);
      expect(write.body.error.code).toBe('device_key_blocked');
    });
  });

  describe('DELETE /api/v1/device-keys/me', () => {
    it('удаляет ключ и каскадом его рецепты; ключ больше не работает', async () => {
      const key = await issueKey();
      const other = await issueKey();
      const [mine, theirs] = await Promise.all(
        [key, other].map((k) =>
          prisma.deviceKey.findUniqueOrThrow({ where: { keyHash: hashDeviceKey(k) } }),
        ),
      );
      const recipe = (authorKeyId: string) => ({
        authorKeyId,
        name: 'Гречка',
        servings: 1,
        kcalPerServing: 100,
        proteinPerServing: 1,
        fatPerServing: 1,
        carbsPerServing: 1,
      });
      await prisma.publicRecipe.create({ data: recipe(mine!.id) });
      await prisma.publicRecipe.create({ data: recipe(theirs!.id) });

      await request(server()).delete('/api/v1/device-keys/me').set('X-Device-Key', key).expect(204);

      expect(await prisma.deviceKey.findUnique({ where: { id: mine!.id } })).toBeNull();
      expect(await prisma.publicRecipe.count({ where: { authorKeyId: mine!.id } })).toBe(0);
      // Чужие данные не тронуты
      expect(await prisma.publicRecipe.count({ where: { authorKeyId: theirs!.id } })).toBe(1);

      const again = await request(server())
        .delete('/api/v1/device-keys/me')
        .set('X-Device-Key', key)
        .expect(401);
      expect(again.body.error.code).toBe('device_key_invalid');
    });

    it('заблокированный ключ тоже может удалить свои данные', async () => {
      const key = await issueKey();
      await prisma.deviceKey.update({
        where: { keyHash: hashDeviceKey(key) },
        data: { blockedAt: new Date() },
      });
      await request(server()).delete('/api/v1/device-keys/me').set('X-Device-Key', key).expect(204);
      expect(await prisma.deviceKey.count()).toBe(0);
    });

    it('без ключа → 401 device_key_required', async () => {
      const res = await request(server()).delete('/api/v1/device-keys/me').expect(401);
      expect(res.body.error.code).toBe('device_key_required');
    });
  });

  describe('хранилище лимитов (Redis)', () => {
    it('скользящее окно: limit запросов проходят, следующий — отказ без записи', async () => {
      const storage = app.get(RedisRateLimitStorage);
      const hits = [];
      for (let i = 0; i < 4; i++) hits.push(await storage.hit('test:window', 60_000, 3));
      expect(hits.map((h) => h.blocked)).toEqual([false, false, false, true]);
      expect(hits.map((h) => h.hits)).toEqual([1, 2, 3, 4]);
      expect(hits[3]?.retryAfterMs).toBeGreaterThan(59_000);
      // Отклонённые запросы в окно не записываются
      expect(await redis.zcard('rl:test:window')).toBe(3);
      expect(await redis.pttl('rl:test:window')).toBeGreaterThan(0);
    });

    it('после окна запросы снова проходят', async () => {
      const storage = app.get(RedisRateLimitStorage);
      expect((await storage.hit('test:short', 200, 1)).blocked).toBe(false);
      expect((await storage.hit('test:short', 200, 1)).blocked).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, 250));
      expect((await storage.hit('test:short', 200, 1)).blocked).toBe(false);
    });

    it('в Redis нет самого ключа устройства — только хэш трекера', async () => {
      const key = await issueKey();
      await request(server()).delete('/api/v1/device-keys/me').set('X-Device-Key', key).expect(204);
      const stored = await redis.keys('*');
      expect(stored.length).toBeGreaterThan(0);
      expect(stored.every((k) => !k.includes(key) && !k.includes(key.slice(3)))).toBe(true);
    });
  });
});

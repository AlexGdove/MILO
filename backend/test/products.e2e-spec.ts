import { randomUUID } from 'node:crypto';

import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { resetData } from './support/db.js';
import { resetRedis } from './support/redis.js';
import { AppException } from '../src/common/errors/app.exception.js';
import { hashDeviceKey } from '../src/modules/device-keys/device-key.js';
import { ModerationService } from '../src/modules/moderation/moderation.service.js';
import { SUBMISSION_REVIEW_EVENT } from '../src/modules/products/products.service.js';
import { RATE_LIMIT_POLICIES } from '../src/modules/rate-limit/rate-limit.policies.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RedisService } from '../src/redis/redis.service.js';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const BUCKWHEAT = { kcal: 343, protein: 12.6, fat: 3.3, carbs: 62.1 };
const BARCODE = '4600682000013';
const body = (overrides: Json = {}) => ({
  name: 'Гречка ядрица',
  brand: 'Мистраль',
  barcode: BARCODE,
  unit: 'g',
  pieceWeight: null,
  per100g: BUCKWHEAT,
  ...overrides,
});

/** Общая база продуктов, автомодерация и решения оператора — на PostgreSQL и Redis. */
describe('Продукты (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let moderation: ModerationService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS);
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    moderation = app.get(ModerationService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetData(prisma);
    await resetRedis(app.get(RedisService));
  });

  const server = () => app.getHttpServer();
  const newKey = async (): Promise<string> =>
    ((await request(server()).post('/api/v1/device-keys').expect(201)).body as { key: string }).key;
  const keyId = async (key: string) =>
    (await prisma.deviceKey.findUniqueOrThrow({ where: { keyHash: hashDeviceKey(key) } })).id;
  const submit = (key: string, payload: Json = body()) =>
    request(server()).post('/api/v1/product-submissions').set('X-Device-Key', key).send(payload);
  const submitOk = async (key: string, payload: Json = body()): Promise<Json> =>
    (await submit(key, payload).expect(201)).body as Json;
  const operator = (active = true) =>
    prisma.operator.create({
      data: {
        telegramUserId: BigInt(Math.floor(Math.random() * 1e12)),
        displayName: 'Анна',
        active,
      },
    });

  describe('предложение → автомодерация', () => {
    it('нормальный продукт принят автоматически и появился в общей базе', async () => {
      const result = await submitOk(await newKey());
      expect(result).toMatchObject({ status: 'approved', reviewedBy: 'auto', flags: [] });
      expect(result.productId).toEqual(expect.any(String));

      const product = await request(server())
        .get(`/api/v1/products/${result.productId}`)
        .expect(200);
      expect(product.body).toMatchObject({
        name: 'Гречка ядрица',
        brand: 'Мистраль',
        barcode: BARCODE,
        unit: 'g',
        pieceWeight: null,
        per100g: BUCKWHEAT,
      });
      expect(await prisma.outboxEvent.count()).toBe(0);
    });

    it('штучный продукт без бренда и штрихкода', async () => {
      const result = await submitOk(
        await newKey(),
        body({
          name: 'Яйцо куриное',
          brand: '',
          barcode: undefined,
          unit: 'pcs',
          pieceWeight: 55,
          per100g: { kcal: 157, protein: 12.7, fat: 11.5, carbs: 0.7 },
        }),
      );
      expect(result).toMatchObject({ status: 'approved', brand: null, barcode: null });
      const product = await prisma.product.findUniqueOrThrow({ where: { id: result.productId } });
      expect(product.pieceWeight?.toNumber()).toBe(55);
    });

    it('мат → rejected с кодом причины, в базу не попадает', async () => {
      const result = await submitOk(await newKey(), body({ name: 'Хуёвая гречка' }));
      expect(result).toMatchObject({
        status: 'rejected',
        reviewedBy: 'auto',
        flags: ['banned_words'],
        productId: null,
      });
      expect(await prisma.product.count()).toBe(0);
    });

    it('сомнительное → pending, событие для бота модерации, в базе пока нет', async () => {
      const result = await submitOk(await newKey(), body({ per100g: { ...BUCKWHEAT, kcal: 100 } }));
      expect(result).toMatchObject({
        status: 'pending',
        reviewedBy: null,
        flags: ['energy_mismatch'],
        productId: null,
      });
      expect(await prisma.product.count()).toBe(0);
      const events = await prisma.outboxEvent.findMany();
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: SUBMISSION_REVIEW_EVENT,
        payload: { submissionId: result.id },
        processedAt: null,
      });
    });

    it('тот же штрихкод и близкий состав → принят как дубль, второго продукта нет', async () => {
      const first = await submitOk(await newKey());
      const second = await submitOk(
        await newKey(),
        body({ name: 'Гречка', per100g: { ...BUCKWHEAT, kcal: 340 } }),
      );
      expect(second).toMatchObject({ status: 'approved', productId: first.productId });
      expect(await prisma.product.count()).toBe(1);
    });

    it('тот же штрихкод, другой состав → человеку (barcode_conflict)', async () => {
      await submitOk(await newKey());
      const second = await submitOk(
        await newKey(),
        body({ per100g: { kcal: 52, protein: 2.8, fat: 2.5, carbs: 4.7 } }),
      );
      expect(second).toMatchObject({ status: 'pending', flags: ['barcode_conflict'] });
    });

    it('то же название и бренд без штрихкода → дубль', async () => {
      const first = await submitOk(await newKey(), body({ barcode: undefined }));
      const second = await submitOk(
        await newKey(),
        body({ barcode: undefined, name: 'ГРЕЧКА ЯДРИЦА', brand: 'мистраль' }),
      );
      expect(second.productId).toBe(first.productId);
    });

    it('после 3 отклонений за неделю — всё на проверку человеку', async () => {
      const key = await newKey();
      for (let i = 0; i < 3; i++) await submitOk(key, body({ name: `Блядская ${i}` }));
      const result = await submitOk(key);
      expect(result).toMatchObject({ status: 'pending', flags: ['untrusted_author'] });
    });

    it.each([
      ['штрихкод с неверной контрольной цифрой', { barcode: '4600682000014' }, 'barcode'],
      ['штрихкод из 10 цифр', { barcode: '1234567890' }, 'barcode'],
      ['штуки без веса', { unit: 'pcs', pieceWeight: null }, 'pieceWeight'],
      ['вес штуки у граммов', { pieceWeight: 10 }, 'unit'],
      [
        'БЖУ больше 100',
        { per100g: { kcal: 500, protein: 60, fat: 30, carbs: 20 } },
        'per100g.carbs',
      ],
      ['ккал больше 900', { per100g: { ...BUCKWHEAT, kcal: 901 } }, 'per100g.kcal'],
      ['три знака после запятой', { per100g: { ...BUCKWHEAT, fat: 3.333 } }, 'per100g.fat'],
      ['пустое название', { name: '   ' }, 'name'],
      ['длинный бренд', { brand: 'Б'.repeat(81) }, 'brand'],
      ['лишнее поле', { status: 'approved' }, 'status'],
    ])('400 validation_failed: %s', async (_name, overrides, field) => {
      const res = await submit(await newKey(), body(overrides));
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('validation_failed');
      expect((res.body.error.details as Json[]).map((d) => d.field)).toContain(field);
      expect(await prisma.productSubmission.count()).toBe(0);
    });

    it('без ключа → 401; заблокированный ключ → 403', async () => {
      const anon = await request(server()).post('/api/v1/product-submissions').send(body());
      expect(anon.status).toBe(401);

      const key = await newKey();
      await moderation.blockDeviceKey((await operator()).id, await keyId(key));
      const blocked = await submit(key);
      expect(blocked.status).toBe(403);
      expect(blocked.body.error.code).toBe('device_key_blocked');
    });

    it(`лимит: ${RATE_LIMIT_POLICIES.productSubmit.limit + 1}-е предложение за сутки → 429`, async () => {
      const key = await newKey();
      for (let i = 0; i < RATE_LIMIT_POLICIES.productSubmit.limit; i++) {
        await submitOk(key, body({ barcode: undefined, name: `Продукт ${i}` }));
      }
      const res = await submit(key, body({ barcode: undefined, name: 'Ещё' }));
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('rate_limited');
    });

    it('Idempotency-Key: повтор → тот же ответ без второго предложения', async () => {
      const key = await newKey();
      const idem = randomUUID();
      const send = () => submit(key).set('Idempotency-Key', idem);
      const first = await send().expect(201);
      const second = await send().expect(201);
      expect(second.body).toEqual(first.body);
      expect(await prisma.productSubmission.count()).toBe(1);

      const other = await submit(key, body({ name: 'Другое' })).set('Idempotency-Key', idem);
      expect(other.status).toBe(422);
      expect(other.body.error.code).toBe('idempotency_mismatch');
    });
  });

  describe('общая база', () => {
    it('поиск по названию и бренду, по штрихкоду; % и _ — обычные символы', async () => {
      const key = await newKey();
      await submitOk(key);
      await submitOk(
        key,
        body({
          name: 'Молоко 100% натуральное',
          brand: 'Простоквашино',
          barcode: undefined,
          unit: 'ml',
          per100g: { kcal: 52, protein: 2.8, fat: 2.5, carbs: 4.7 },
        }),
      );
      await submitOk(
        key,
        body({
          name: 'Хлопья овсяные',
          brand: 'Мистраль',
          barcode: undefined,
          per100g: { kcal: 366, protein: 12.3, fat: 6.2, carbs: 61.8 },
        }),
      );

      const search = async (query: Json) =>
        (
          (await request(server()).get('/api/v1/products').query(query).expect(200)).body
            .items as Json[]
        ).map((p) => p.name as string);

      expect(await search({ q: 'мистр' })).toEqual(['Хлопья овсяные', 'Гречка ядрица']);
      expect(await search({ q: 'греч' })).toEqual(['Гречка ядрица']);
      expect(await search({ barcode: BARCODE })).toEqual(['Гречка ядрица']);
      expect(await search({ q: '0%' })).toEqual(['Молоко 100% натуральное']);
      expect(await search({ q: '%%' })).toEqual([]);
    });

    it('отклонённые и ожидающие в базу не попадают', async () => {
      const key = await newKey();
      await submitOk(key, body({ name: 'Хуйня' }));
      await submitOk(key, body({ per100g: { ...BUCKWHEAT, kcal: 50 } }));
      const res = await request(server()).get('/api/v1/products').expect(200);
      expect(res.body).toEqual({ items: [], nextCursor: null });
    });

    it('страницы по курсору без пропусков и повторов', async () => {
      const key = await newKey();
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) {
        ids.push(
          (await submitOk(key, body({ barcode: undefined, name: `Продукт ${i}` })))
            .productId as string,
        );
      }
      const seen: string[] = [];
      let cursor: string | null = null;
      do {
        const res = await request(server())
          .get('/api/v1/products')
          .query({ limit: 2, ...(cursor ? { cursor } : {}) })
          .expect(200);
        seen.push(...(res.body.items as Json[]).map((p) => p.id as string));
        cursor = res.body.nextCursor as string | null;
      } while (cursor);
      expect(seen).toEqual([...ids].reverse());
    });

    it.each([
      ['короткий поиск', { q: 'а' }],
      ['штрихкод не из цифр', { barcode: 'abc' }],
      ['limit 51', { limit: 51 }],
      ['испорченный курсор', { cursor: 'abc' }],
    ])('400 validation_failed: %s', async (_name, query) => {
      const res = await request(server()).get('/api/v1/products').query(query);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('validation_failed');
    });

    it.each([
      ['не UUID', 'abc'],
      ['нет такого', randomUUID()],
    ])('продукт: %s → 404 product_not_found', async (_name, id) => {
      const res = await request(server()).get(`/api/v1/products/${id}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('product_not_found');
    });
  });

  describe('свои предложения', () => {
    it('только свои, новые сверху, со статусами', async () => {
      const key = await newKey();
      const a = await submitOk(key);
      const b = await submitOk(key, body({ name: 'Хуйня' }));
      await submitOk(await newKey(), body({ barcode: undefined, name: 'Чужое' }));

      const res = await request(server())
        .get('/api/v1/me/product-submissions')
        .set('X-Device-Key', key)
        .expect(200);
      expect((res.body.items as Json[]).map((s) => [s.id, s.status])).toEqual([
        [b.id, 'rejected'],
        [a.id, 'approved'],
      ]);
    });
  });

  describe('решения оператора (для бота модерации, этап 9)', () => {
    const pending = async () =>
      submitOk(await newKey(), body({ per100g: { ...BUCKWHEAT, kcal: 100 } }));

    it('принять: продукт появился, решение — оператора, действие в журнале', async () => {
      const submission = await pending();
      const op = await operator();
      const { productId } = await moderation.approveSubmission(op.id, submission.id as string);

      const saved = await prisma.productSubmission.findUniqueOrThrow({
        where: { id: submission.id },
      });
      expect(saved).toMatchObject({ status: 'approved', reviewedBy: 'operator', productId });
      await request(server()).get(`/api/v1/products/${productId}`).expect(200);
      expect(
        await prisma.moderationAction.findMany({ select: { action: true, submissionId: true } }),
      ).toEqual([{ action: 'approve_submission', submissionId: submission.id }]);
    });

    it('принять, когда штрихкод уже в базе — привязка к существующему продукту', async () => {
      const first = await submitOk(await newKey());
      const conflict = await submitOk(
        await newKey(),
        body({ per100g: { kcal: 52, protein: 2.8, fat: 2.5, carbs: 4.7 } }),
      );
      const { productId } = await moderation.approveSubmission(
        (await operator()).id,
        conflict.id as string,
      );
      expect(productId).toBe(first.productId);
      expect(await prisma.product.count()).toBe(1);
    });

    it('отклонить; повторное решение → already_reviewed', async () => {
      const submission = await pending();
      const op = await operator();
      await moderation.reject(op.id, submission.id as string);
      expect(
        (await prisma.productSubmission.findUniqueOrThrow({ where: { id: submission.id } })).status,
      ).toBe('rejected');

      const error: unknown = await moderation
        .approveSubmission(op.id, submission.id as string)
        .catch((e: unknown) => e);
      expect((error as AppException).code).toBe('already_reviewed');
      expect(await prisma.product.count()).toBe(0);
    });

    it('решённое автоматически оператор не переигрывает', async () => {
      const auto = await submitOk(await newKey());
      const error: unknown = await moderation
        .reject((await operator()).id, auto.id as string)
        .catch((e: unknown) => e);
      expect((error as AppException).code).toBe('already_reviewed');
    });

    it('неактивный оператор → operator_inactive, ничего не меняется', async () => {
      const submission = await pending();
      const error: unknown = await moderation
        .approveSubmission((await operator(false)).id, submission.id as string)
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(AppException);
      expect((error as AppException).code).toBe('operator_inactive');
      expect(await prisma.product.count()).toBe(0);
      expect(await prisma.moderationAction.count()).toBe(0);
    });

    it('нет предложения → submission_not_found', async () => {
      const error: unknown = await moderation
        .approveSubmission((await operator()).id, randomUUID())
        .catch((e: unknown) => e);
      expect((error as AppException).code).toBe('submission_not_found');
    });
  });
});

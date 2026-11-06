import { randomBytes } from 'node:crypto';

import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { resetData } from './support/db.js';
import { fromPrismaError } from '../src/prisma/prisma-errors.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

/** Интеграция с реальной PostgreSQL (milo_test): схема, ограничения, каскады, ошибки. */
describe('База данных (e2e, PostgreSQL)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS);
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetData(prisma);
  });

  const newKey = () =>
    prisma.deviceKey.create({ data: { keyHash: randomBytes(32).toString('hex') } });

  const productData = (overrides: Record<string, unknown> = {}) => ({
    name: 'Гречка ядрица',
    brand: null,
    barcode: null,
    unit: 'g' as const,
    pieceWeight: null,
    kcal: 343,
    protein: 12.6,
    fat: 3.3,
    carbs: 62.1,
    createdAt: new Date(),
    ...overrides,
  });

  const submissionData = (deviceKeyId: string, overrides: Record<string, unknown> = {}) => ({
    ...productData(),
    deviceKeyId,
    ...overrides,
  });

  it('GET /api/v1/health/ready → 200, база и Redis доступны', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);
    expect(res.body).toEqual({ status: 'ok', checks: { database: 'ok', redis: 'ok' } });
  });

  it('продукт сохраняется и читается с точными десятичными значениями', async () => {
    const created = await prisma.product.create({
      data: productData({ unit: 'pcs', pieceWeight: 55.5, fat: 11.55 }),
    });
    const loaded = await prisma.product.findUniqueOrThrow({ where: { id: created.id } });
    expect(loaded.fat.toNumber()).toBe(11.55);
    expect(loaded.pieceWeight?.toNumber()).toBe(55.5);
    expect(loaded.carbs.toNumber()).toBe(62.1);
  });

  it('повтор штрихкода в общей базе — P2002 → 409 conflict', async () => {
    await prisma.product.create({ data: productData({ barcode: '4600682000013' }) });
    const error: unknown = await prisma.product
      .create({ data: productData({ barcode: '4600682000013', name: 'Другое' }) })
      .catch((e: unknown) => e);

    const mapped = fromPrismaError(error);
    expect(mapped?.getStatus()).toBe(409);
    expect(mapped?.code).toBe('conflict');
  });

  it('продукты без штрихкода не конфликтуют друг с другом', async () => {
    await prisma.product.create({ data: productData() });
    await prisma.product.create({ data: productData() });
    expect(await prisma.product.count()).toBe(2);
  });

  it('правка несуществующей записи — P2025 → 404 not_found', async () => {
    const error: unknown = await prisma.product
      .update({ where: { id: '00000000-0000-4000-8000-000000000000' }, data: { name: 'X' } })
      .catch((e: unknown) => e);
    expect(fromPrismaError(error)?.getStatus()).toBe(404);
  });

  describe('CHECK-ограничения (последний рубеж после DTO)', () => {
    it('название не может состоять из пробелов', async () => {
      await expect(prisma.product.create({ data: productData({ name: '   ' }) })).rejects.toThrow(
        /products_name_check/,
      );
    });

    it('штрихкод — только 8, 12, 13 или 14 цифр', async () => {
      await expect(
        prisma.product.create({ data: productData({ barcode: '12345' }) }),
      ).rejects.toThrow(/products_barcode_check/);
      await expect(
        prisma.product.create({ data: productData({ barcode: '46006820000AB' }) }),
      ).rejects.toThrow(/products_barcode_check/);
    });

    it('штучный продукт без веса штуки отклоняется, у граммового вес запрещён', async () => {
      await expect(
        prisma.product.create({ data: productData({ unit: 'pcs', pieceWeight: null }) }),
      ).rejects.toThrow(/piece_weight_check/);
      await expect(
        prisma.product.create({ data: productData({ pieceWeight: 50 }) }),
      ).rejects.toThrow(/piece_weight_check/);
    });

    it('БЖУ на 100 г в сумме не больше 100 — и у продукта, и у предложения', async () => {
      const key = await newKey();
      const tooMuch = { protein: 60, fat: 30, carbs: 20 };
      await expect(prisma.product.create({ data: productData(tooMuch) })).rejects.toThrow(
        /products_nutrients_check/,
      );
      await expect(
        prisma.productSubmission.create({ data: submissionData(key.id, tooMuch) }),
      ).rejects.toThrow(/product_submissions_nutrients_check/);
    });

    it('решение есть только у решённых предложений', async () => {
      const key = await newKey();
      await expect(
        prisma.productSubmission.create({
          data: submissionData(key.id, { status: 'approved' }),
        }),
      ).rejects.toThrow(/product_submissions_review_check/);
      await expect(
        prisma.productSubmission.create({
          data: submissionData(key.id, { reviewedBy: 'auto', reviewedAt: new Date() }),
        }),
      ).rejects.toThrow(/product_submissions_review_check/);
    });

    it('связь сообщения бота — ровно с одним: обращением или предложением', async () => {
      await expect(
        prisma.telegramMessageLink.create({ data: { chatId: 1n, messageId: 1 } }),
      ).rejects.toThrow(/telegram_message_links_target_check/);
    });

    it('нарушение CHECK не превращается в ошибку клиента (останется 500)', async () => {
      const error: unknown = await prisma.product
        .create({ data: productData({ kcal: 901 }) })
        .catch((e: unknown) => e);
      expect(error).toBeInstanceOf(Error);
      expect(fromPrismaError(error)).toBeNull();
    });
  });

  it('удаление ключа устройства стирает его предложения и обращения; общая база и журнал остаются', async () => {
    const author = await newKey();
    const other = await newKey();
    const product = await prisma.product.create({ data: productData() });
    const submission = await prisma.productSubmission.create({
      data: submissionData(author.id, {
        status: 'approved',
        reviewedBy: 'operator',
        reviewedAt: new Date(),
        productId: product.id,
      }),
    });
    const ticket = await prisma.supportTicket.create({
      data: { deviceKeyId: author.id, messages: { create: [{ author: 'user', text: 'Привет' }] } },
    });
    const operator = await prisma.operator.create({
      data: { telegramUserId: 42n, displayName: 'Анна' },
    });
    await prisma.moderationAction.create({
      data: { operatorId: operator.id, submissionId: submission.id, action: 'approve_submission' },
    });
    await prisma.productSubmission.create({ data: submissionData(other.id) });

    await prisma.deviceKey.delete({ where: { id: author.id } });

    expect(await prisma.productSubmission.count({ where: { deviceKeyId: author.id } })).toBe(0);
    expect(await prisma.supportTicket.count({ where: { id: ticket.id } })).toBe(0);
    expect(await prisma.supportMessage.count()).toBe(0);
    // Принятый продукт остаётся в общей базе — уже без автора
    expect(await prisma.product.count({ where: { id: product.id } })).toBe(1);
    const actions = await prisma.moderationAction.findMany();
    expect(actions).toHaveLength(1);
    expect(actions[0]?.submissionId).toBeNull();
    // Данные другого устройства не затронуты
    expect(await prisma.productSubmission.count({ where: { deviceKeyId: other.id } })).toBe(1);
  });

  it('номера обращений идут по порядку', async () => {
    const key = await newKey();
    const first = await prisma.supportTicket.create({ data: { deviceKeyId: key.id } });
    const second = await prisma.supportTicket.create({ data: { deviceKeyId: key.id } });
    expect(first.number).toBe(1);
    expect(second.number).toBe(2);
  });

  it('поиск по подстроке названия без учёта регистра', async () => {
    for (const name of ['Гречка с курицей', 'Омлет', 'Куриный суп']) {
      await prisma.product.create({ data: productData({ name }) });
    }
    const found = await prisma.product.findMany({
      where: { name: { contains: 'кур', mode: 'insensitive' } },
      orderBy: { name: 'asc' },
    });
    expect(found.map((r) => r.name)).toEqual(['Гречка с курицей', 'Куриный суп']);
  });
});

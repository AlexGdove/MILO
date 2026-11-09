import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { resetData } from './support/db.js';
import { FakeBotApi } from './support/fake-bot-api.js';
import { resetRedis } from './support/redis.js';
import {
  CLIENT_ERROR_EVENT,
  ClientErrorsService,
} from '../src/modules/client-errors/client-errors.service.js';
import type { ClientErrorDto } from '../src/modules/client-errors/dto/client-error.dto.js';
import {
  CLIENT_ERRORS_TTL_MS,
  CleanupService,
} from '../src/modules/maintenance/cleanup.service.js';
import { OutboxWorker } from '../src/modules/outbox/outbox.worker.js';
import { RATE_LIMIT_POLICIES } from '../src/modules/rate-limit/rate-limit.policies.js';
import { TELEGRAM_BOTS, type TelegramBots } from '../src/modules/telegram/telegram.tokens.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RedisService } from '../src/redis/redis.service.js';

const CHAT = -1001;

const REPORT = {
  kind: 'error',
  message: 'Cannot read properties of undefined (reading 5)',
  stack: 'TypeError: x\n    at render (https://milo-app.ru/assets/a.js:1:2)',
  platform: 'web',
  appVersion: '1.1.2',
  route: '/pantry?query=secret#frag',
  userAgent: 'Mozilla/5.0 test',
};

/** Сбор ошибок приложения: endpoint, объединение повторов, уведомления и очистка. */
describe('Ошибки приложения (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let outbox: OutboxWorker;
  let service: ClientErrorsService;
  const api = new FakeBotApi();
  const bots: TelegramBots = {
    support: { api, chatId: CHAT, threadId: 7 },
    moderation: null,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TELEGRAM_BOTS)
      .useValue(bots)
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS);
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
    outbox = app.get(OutboxWorker);
    service = app.get(ClientErrorsService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetData(prisma);
    await resetRedis(app.get(RedisService));
    api.sent.length = 0;
  });

  const server = () => app.getHttpServer();
  const newKey = async (): Promise<string> =>
    ((await request(server()).post('/api/v1/device-keys').expect(201)).body as { key: string }).key;
  const send = (key: string, body: object = REPORT) =>
    request(server()).post('/api/v1/client-errors').set('X-Device-Key', key).send(body);

  it('принимает отчёт: 204 и запись без параметров адреса', async () => {
    const key = await newKey();
    await send(key).expect(204);

    const rows = await prisma.clientError.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      kind: 'error',
      platform: 'web',
      appVersion: '1.1.2',
      route: '/pantry',
      count: 1,
    });
  });

  it('без ключа устройства — 401', async () => {
    await request(server()).post('/api/v1/client-errors').send(REPORT).expect(401);
  });

  it('неверные данные — 400', async () => {
    const key = await newKey();
    await send(key, { ...REPORT, kind: 'weird' }).expect(400);
    await send(key, { ...REPORT, message: '' }).expect(400);
    await send(key, { ...REPORT, appVersion: 'latest' }).expect(400);
    await send(key, { ...REPORT, platform: 'tv' }).expect(400);
    expect(await prisma.clientError.count()).toBe(0);
  });

  it('одинаковая ошибка у разных устройств объединяется, счётчик растёт', async () => {
    await send(await newKey()).expect(204);
    await send(await newKey(), {
      ...REPORT,
      message: 'Cannot read properties of undefined (reading 9)',
    }).expect(204);

    const rows = await prisma.clientError.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.count).toBe(2);
  });

  it('другая версия приложения — отдельная запись', async () => {
    const key = await newKey();
    await send(key).expect(204);
    await send(key, { ...REPORT, appVersion: '1.1.3' }).expect(204);
    expect(await prisma.clientError.count()).toBe(2);
  });

  it('в outbox — событие только для первой ошибки и порогов 10, 100…', async () => {
    for (let i = 0; i < 11; i += 1) await service.report(REPORT as ClientErrorDto);

    const events = await prisma.outboxEvent.findMany({
      where: { type: CLIENT_ERROR_EVENT },
      orderBy: { createdAt: 'asc' },
    });
    expect(events.map((e) => (e.payload as { count: number }).count)).toEqual([1, 10]);
  });

  it('бот поддержки пишет об ошибке в тему сообщений, повтор — не шлёт заново', async () => {
    await send(await newKey()).expect(204);
    await outbox.processBatch();

    expect(api.sent).toHaveLength(1);
    expect(api.sent[0]).toMatchObject({ chatId: CHAT, options: { threadId: 7 } });
    expect(api.sent[0]?.text).toContain('Новая ошибка в приложении');
    expect(api.sent[0]?.text).toContain('1.1.2');

    await outbox.processBatch();
    expect(api.sent).toHaveLength(1);
  });

  it('ошибку без новых повторов дольше 30 дней очистка удаляет', async () => {
    await send(await newKey()).expect(204);
    const later = new Date(Date.now() + CLIENT_ERRORS_TTL_MS + 60_000);

    const result = await app.get(CleanupService).run(later);

    expect(result.clientErrors).toBe(1);
    expect(await prisma.clientError.count()).toBe(0);
  });

  it('лимит отчётов с одного устройства', async () => {
    const key = await newKey();
    const { limit } = RATE_LIMIT_POLICIES.clientError;
    for (let i = 0; i < limit; i += 1) await send(key).expect(204);
    await send(key).expect(429);
  });
});

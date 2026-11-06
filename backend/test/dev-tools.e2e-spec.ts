import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { resetData } from './support/db.js';
import { resetRedis } from './support/redis.js';
import { DEV_OPERATOR } from '../src/modules/dev-tools/dev-tools.controller.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RedisService } from '../src/redis/redis.service.js';

/** Служебный ответ «как оператор» для локальной разработки (DEV_TOOLS, DevToolsGuard). */
describe('Служебные маршруты разработки (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const server = () => app.getHttpServer();
  const reply = (number: number, text: string) =>
    request(server()).post(`/api/v1/dev/support/tickets/${number}/reply`).send({ text });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS);
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    delete process.env.DEV_TOOLS;
    await app.close();
  });

  beforeEach(async () => {
    process.env.DEV_TOOLS = 'true';
    await resetData(prisma);
    await resetRedis(app.get(RedisService));
  });

  it('ответ по номеру обращения: от «Оператор (разработка)», статус answered', async () => {
    const { key } = (await request(server()).post('/api/v1/device-keys').expect(201)).body as {
      key: string;
    };
    const ticket = (
      await request(server())
        .post('/api/v1/support/tickets')
        .set('X-Device-Key', key)
        .send({ text: 'Помогите' })
        .expect(201)
    ).body as { id: string; number: number };

    const res = await reply(ticket.number, 'Сейчас поможем').expect(201);
    expect(res.body).toMatchObject({
      author: 'operator',
      operatorName: DEV_OPERATOR.displayName,
      text: 'Сейчас поможем',
    });
    const saved = await request(server())
      .get(`/api/v1/support/tickets/${ticket.id}`)
      .set('X-Device-Key', key)
      .expect(200);
    expect(saved.body.status).toBe('answered');

    // Повторный ответ — тот же служебный оператор
    await reply(ticket.number, 'Ещё').expect(201);
    expect(await prisma.operator.count()).toBe(1);
  });

  it('нет такого номера → 404 ticket_not_found; пустой текст → 400', async () => {
    const missing = await reply(999, 'x');
    expect(missing.status).toBe(404);
    expect(missing.body.error.code).toBe('ticket_not_found');
    expect((await reply(1, '  ')).status).toBe(400);
  });

  it.each([
    ['DEV_TOOLS не задан', undefined, 'development'],
    ['DEV_TOOLS=false', 'false', 'development'],
    ['production, даже с DEV_TOOLS=true', 'true', 'production'],
  ])('%s → 404 not_found, как будто маршрута нет', async (_name, flag, nodeEnv) => {
    const previous = process.env.NODE_ENV;
    if (flag === undefined) delete process.env.DEV_TOOLS;
    else process.env.DEV_TOOLS = flag;
    process.env.NODE_ENV = nodeEnv;
    try {
      const res = await reply(1, 'x');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('not_found');
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});

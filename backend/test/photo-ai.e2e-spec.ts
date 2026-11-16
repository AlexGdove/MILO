import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { resetData } from './support/db.js';
import { resetRedis } from './support/redis.js';
import type { Plan } from '../src/generated/prisma/client.js';
import { generateSessionToken, hashSessionToken } from '../src/modules/auth/auth-crypto.js';
import { PHOTO_MAX_BYTES } from '../src/modules/photo-ai/photo-ai.config.js';
import {
  VisionProvider,
  VisionProviderError,
  type VisionRequest,
} from '../src/modules/photo-ai/vision-provider.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RedisService } from '../src/redis/redis.service.js';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const DAY_MS = 24 * 60 * 60_000;
const DAILY_LIMIT = 3;
const ROUTE = '/api/v1/photo-ai/recognize';

/** Начало настоящего JPEG; содержимое картинки подменённой модели не важно */
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);
const jpeg = (size = JPEG.length): string =>
  Buffer.concat([JPEG, Buffer.alloc(Math.max(0, size - JPEG.length), 1)]).toString('base64');

const REPLY = JSON.stringify({
  dish: 'Гречневая каша с маслом',
  ingredients: [
    { name: 'гречка отварная', grams: 200 },
    { name: 'Масло сливочное', grams: 10.4 },
    { name: 'марсианский соус', grams: 30 },
  ],
});

/** Модель вместо настоящей: запоминает запросы и отвечает заданным текстом. */
class FakeVisionProvider extends VisionProvider {
  readonly requests: VisionRequest[] = [];
  reply: () => Promise<string> = () => Promise.resolve(REPLY);
  recognize(request: VisionRequest): Promise<string> {
    this.requests.push(request);
    return this.reply();
  }
}

async function createApp(vision: VisionProvider): Promise<NestExpressApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(VisionProvider)
    .useValue(vision)
    .compile();
  const app = moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS);
  configureApp(app);
  await app.init();
  return app;
}

/** Распознавание блюда по фото (решения №68, №75): тариф, лимит, разбор ответа, КБЖУ по справочнику. */
describe('Фото-ИИ (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const vision = new FakeVisionProvider();
  const savedEnv = { ...process.env };

  beforeAll(async () => {
    process.env.PHOTO_AI_PROVIDER = 'openai';
    process.env.PHOTO_AI_BASE_URL = 'http://127.0.0.1:1';
    process.env.PHOTO_AI_DAILY_LIMIT = String(DAILY_LIMIT);
    app = await createApp(vision);
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
    process.env = savedEnv;
  });

  beforeEach(async () => {
    vision.requests.length = 0;
    vision.reply = () => Promise.resolve(REPLY);
    await resetData(prisma);
    await resetRedis(app.get(RedisService));
  });

  /** Аккаунт с тарифом и действующей сессией; возвращает токен. */
  async function signIn(plan: Plan, planUntil: Date | null = null): Promise<string> {
    const token = generateSessionToken();
    await prisma.account.create({
      data: {
        email: `${plan}-${Date.now()}-${Math.random()}@example.com`,
        passwordHash: 'x',
        emailVerifiedAt: new Date(),
        plan,
        planUntil,
        sessions: {
          create: { tokenHash: hashSessionToken(token), expiresAt: new Date(Date.now() + DAY_MS) },
        },
      },
    });
    return token;
  }

  const recognize = (token: string | null, body: Json = { image: jpeg() }) => {
    const call = request(app.getHttpServer()).post(ROUTE);
    return (token === null ? call : call.set('Authorization', `Bearer ${token}`)).send(body);
  };

  it('без входа — 401, модель не вызывается', async () => {
    const response = await recognize(null);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('session_required');
    expect(vision.requests).toHaveLength(0);
  });

  it('бесплатный тариф — 403 photo_ai_plan_required', async () => {
    const response = await recognize(await signIn('free'));
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('photo_ai_plan_required');
    expect(vision.requests).toHaveLength(0);
  });

  it('оплаченный, но истёкший тариф считается бесплатным', async () => {
    const response = await recognize(await signIn('plus', new Date(Date.now() - 1000)));
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('photo_ai_plan_required');
  });

  it('платный тариф: блюдо, ингредиенты и КБЖУ по справочнику', async () => {
    const token = await signIn('plus', new Date(Date.now() + DAY_MS));
    const response = await recognize(token, { image: jpeg(), hint: '  гречка с маслом  ' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      dish: 'Гречневая каша с маслом',
      ingredients: [
        {
          name: 'гречка отварная',
          grams: 200,
          matchedName: 'гречка отварная',
          per100g: { kcal: 110, protein: 4.2, fat: 1.1, carbs: 21 },
        },
        {
          name: 'Масло сливочное',
          grams: 10,
          matchedName: 'масло сливочное',
          per100g: { kcal: 748, protein: 0.5, fat: 82.5, carbs: 0.8 },
        },
        // Нет в справочнике: КБЖУ не выдумывается — продукт выберет пользователь
        { name: 'марсианский соус', grams: 30, matchedName: null, per100g: null },
      ],
      usage: { used: 1, limit: DAILY_LIMIT },
    });
  });

  it('модель получает фото, справочник названий и подсказку пользователя', async () => {
    await recognize(await signIn('unlimited'), { image: jpeg(), hint: 'пельмени, 15 штук' });

    expect(vision.requests).toHaveLength(1);
    const sent = vision.requests[0];
    expect(sent?.mime).toBe('image/jpeg');
    expect(sent?.imageBase64).toBe(jpeg());
    expect(sent?.prompt).toContain('гречка отварная');
    expect(sent?.prompt).toContain('«пельмени, 15 штук»');
  });

  it('без подсказки в запросе к модели нет раздела о словах пользователя', async () => {
    await recognize(await signIn('unlimited'));
    expect(vision.requests[0]?.prompt).not.toContain('Пользователь описал');
  });

  it('тариф plus: после суточного лимита — 429 photo_ai_limit', async () => {
    const token = await signIn('plus');
    for (let i = 1; i <= DAILY_LIMIT; i += 1) {
      const response = await recognize(token);
      expect(response.status).toBe(200);
      expect(response.body.usage).toEqual({ used: i, limit: DAILY_LIMIT });
    }
    const blocked = await recognize(token);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('photo_ai_limit');
    expect(vision.requests).toHaveLength(DAILY_LIMIT);
  });

  it('лимит считается на аккаунт: другой аккаунт не затронут', async () => {
    const first = await signIn('plus');
    for (let i = 0; i < DAILY_LIMIT; i += 1) await recognize(first);
    const response = await recognize(await signIn('plus'));
    expect(response.status).toBe(200);
    expect(response.body.usage.used).toBe(1);
  });

  it('тариф unlimited: без суточного лимита', async () => {
    const token = await signIn('unlimited');
    for (let i = 0; i <= DAILY_LIMIT; i += 1) {
      const response = await recognize(token);
      expect(response.status).toBe(200);
      expect(response.body.usage).toEqual({ used: null, limit: null });
    }
  });

  it('не картинка — 422 photo_invalid, попытка не тратится', async () => {
    const token = await signIn('plus');
    const text = await recognize(token, { image: Buffer.from('просто текст').toString('base64') });
    expect(text.status).toBe(422);
    expect(text.body.error.code).toBe('photo_invalid');
    expect(vision.requests).toHaveLength(0);

    const next = await recognize(token);
    expect(next.body.usage.used).toBe(1);
  });

  it('фото больше 2 МБ — отказ, модель не вызывается', async () => {
    const response = await recognize(await signIn('plus'), { image: jpeg(PHOTO_MAX_BYTES + 3) });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('validation_failed');
    expect(vision.requests).toHaveLength(0);
  });

  it('фото в сотни килобайт проходит: предел тела для этого маршрута поднят', async () => {
    const response = await recognize(await signIn('plus'), { image: jpeg(600 * 1024) });
    expect(response.status).toBe(200);
  });

  it('на остальных маршрутах предел тела прежний — 64 КБ', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'a@example.com', password: 'x'.repeat(100 * 1024) });
    expect(response.status).toBe(413);
  });

  it('слишком длинная подсказка и не base64 — 400', async () => {
    const token = await signIn('plus');
    const longHint = await recognize(token, { image: jpeg(), hint: 'а'.repeat(201) });
    expect(longHint.status).toBe(400);
    const notBase64 = await recognize(token, { image: 'это не base64 !!!' });
    expect(notBase64.status).toBe(400);
    expect(vision.requests).toHaveLength(0);
  });

  it('на фото не еда — 422 photo_no_food', async () => {
    vision.reply = () => Promise.resolve('{"dish":null,"ingredients":[]}');
    const response = await recognize(await signIn('plus'));
    expect(response.status).toBe(422);
    expect(response.body.error.code).toBe('photo_no_food');
  });

  it('модель ответила не JSON — 502 photo_ai_failed', async () => {
    vision.reply = () => Promise.resolve('На фото вкусный суп.');
    const response = await recognize(await signIn('plus'));
    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe('photo_ai_failed');
  });

  it('модель недоступна — 502 photo_ai_failed, следующий запрос работает', async () => {
    const token = await signIn('unlimited');
    vision.reply = () => Promise.reject(new VisionProviderError('timeout', 'timed out'));
    const failed = await recognize(token);
    expect(failed.status).toBe(502);
    expect(failed.body.error.code).toBe('photo_ai_failed');

    vision.reply = () => Promise.resolve(REPLY);
    expect((await recognize(token)).status).toBe(200);
  });

  it('запросы к модели идут строго по одному', async () => {
    const token = await signIn('unlimited');
    let active = 0;
    let maxActive = 0;
    vision.reply = async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 30));
      active -= 1;
      return REPLY;
    };
    const responses = await Promise.all([recognize(token), recognize(token), recognize(token)]);
    expect(responses.map((response) => response.status)).toEqual([200, 200, 200]);
    expect(maxActive).toBe(1);
  });

  it('очередь переполнена — 503 photo_ai_busy', async () => {
    const token = await signIn('unlimited');
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    vision.reply = async () => {
      await gate;
      return REPLY;
    };
    // 5 запросов ждут модель (предел очереди), шестой получает отказ сразу
    const waiting = Array.from({ length: 5 }, () => recognize(token).then((r) => r.status));
    await new Promise((resolve) => setTimeout(resolve, 300));
    const busy = await recognize(token)
      .then((response) => response)
      .finally(release);
    expect(busy.status).toBe(503);
    expect(busy.body.error.code).toBe('photo_ai_busy');

    expect(await Promise.all(waiting)).toEqual([200, 200, 200, 200, 200]);
  });
});

describe('Фото-ИИ выключен (e2e)', () => {
  it('без PHOTO_AI_PROVIDER — 503 photo_ai_unavailable', async () => {
    const saved = { ...process.env };
    delete process.env.PHOTO_AI_PROVIDER;
    delete process.env.PHOTO_AI_BASE_URL;
    const vision = new FakeVisionProvider();
    const app = await createApp(vision);
    try {
      const prisma = app.get(PrismaService);
      await resetData(prisma);
      await resetRedis(app.get(RedisService));
      const token = generateSessionToken();
      await prisma.account.create({
        data: {
          email: 'off@example.com',
          passwordHash: 'x',
          emailVerifiedAt: new Date(),
          plan: 'unlimited',
          sessions: {
            create: {
              tokenHash: hashSessionToken(token),
              expiresAt: new Date(Date.now() + DAY_MS),
            },
          },
        },
      });
      const response = await request(app.getHttpServer())
        .post(ROUTE)
        .set('Authorization', `Bearer ${token}`)
        .send({ image: jpeg() });
      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('photo_ai_unavailable');
      expect(vision.requests).toHaveLength(0);
    } finally {
      await app.close();
      process.env = saved;
    }
  });
});

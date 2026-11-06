import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { resetRedis } from './support/redis.js';
import {
  OFF_SEARCH_URL,
  OFF_USER_AGENT,
  UPSTREAM_LIMIT,
} from '../src/modules/food-catalog/food-catalog.service.js';
import { RedisService } from '../src/redis/redis.service.js';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const HIT = {
  code: '4813494063866',
  product_name: 'Buckwheat',
  product_name_ru: 'Гречка',
  brands: ['Ярмарка'],
  quantity: '900 г',
  nutriments: {
    'energy-kcal_100g': 340,
    proteins_100g: 13,
    fat_100g: 3.1,
    carbohydrates_100g: 66,
  },
};
const NO_NUTRIMENTS = { code: '4600000000001', product_name: 'Без КБЖУ', nutriments: {} };

/**
 * Поиск в Open Food Facts через сервер (решение №53). Сам Open Food Facts подменён:
 * в ESM-режиме Jest нет `jest.fn`, поэтому `fetch` заменяем вручную и считаем вызовы.
 */
describe('Каталог Open Food Facts (e2e)', () => {
  let app: NestExpressApplication;
  const realFetch = globalThis.fetch;
  let calls: { url: URL; init: RequestInit | undefined }[];
  let reply: () => Promise<Response>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS);
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    globalThis.fetch = realFetch;
    await app.close();
  });

  beforeEach(async () => {
    await resetRedis(app.get(RedisService));
    calls = [];
    reply = () => Promise.resolve(Response.json({ hits: [HIT, NO_NUTRIMENTS] }));
    globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : input);
      // Запросы supertest к самому приложению идут не через fetch, но на всякий случай
      if (!url.href.startsWith(OFF_SEARCH_URL)) return realFetch(input, init);
      calls.push({ url, init });
      return reply();
    }) as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  const search = (q: string) =>
    request(app.getHttpServer()).get('/api/v1/food-catalog/search').query({ q });

  it('отдаёт продукты с КБЖУ, отбрасывая товары без цифр', async () => {
    const res = await search('гречка').expect(200);
    expect((res.body as Json).items).toEqual([
      {
        code: '4813494063866',
        name: 'Гречка',
        brand: 'Ярмарка',
        unit: 'g',
        per100g: { kcal: 340, protein: 13, fat: 3.1, carbs: 66 },
      },
    ]);
    expect(calls).toHaveLength(1);
    const call = calls[0]!;
    expect(call.url.searchParams.get('q')).toBe('гречка');
    expect(call.url.searchParams.get('fields')).toContain('nutriments');
    expect(new Headers(call.init?.headers).get('User-Agent')).toBe(OFF_USER_AGENT);
  });

  it('повторный запрос (другой регистр и пробелы) — из кэша, без обращения к Open Food Facts', async () => {
    await search('гречка').expect(200);
    const res = await search('  ГРЕЧКА ').expect(200);
    expect((res.body as Json).items).toHaveLength(1);
    expect(calls).toHaveLength(1);
  });

  it('Open Food Facts недоступен → 503 catalog_unavailable, ошибка не кэшируется', async () => {
    reply = () => Promise.resolve(new Response('down', { status: 503 }));
    const res = await search('гречка').expect(503);
    expect((res.body as Json).error.code).toBe('catalog_unavailable');

    reply = () => Promise.reject(new Error('timeout'));
    expect(((await search('гречка').expect(503)).body as Json).error.code).toBe(
      'catalog_unavailable',
    );

    reply = () => Promise.resolve(Response.json({ hits: [HIT] }));
    await search('гречка').expect(200);
    expect(calls).toHaveLength(3);
  });

  it(`больше ${UPSTREAM_LIMIT.limit} новых запросов в минуту → 503 catalog_busy`, async () => {
    for (let i = 0; i < UPSTREAM_LIMIT.limit; i += 1) {
      await search(`продукт ${i}`).expect(200);
    }
    const res = await search('ещё один').expect(503);
    expect((res.body as Json).error.code).toBe('catalog_busy');
    expect(calls).toHaveLength(UPSTREAM_LIMIT.limit);
    // Закэшированное по-прежнему отдаётся
    await search('продукт 0').expect(200);
  });

  it.each([
    ['пустой', ''],
    ['одна буква', ' г '],
    ['длиннее 60', 'а'.repeat(61)],
  ])('запрос %s → 400 без обращения к Open Food Facts', async (_name, q) => {
    await search(q).expect(400);
    expect(calls).toHaveLength(0);
  });
});

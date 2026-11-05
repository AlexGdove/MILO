import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const ALLOWED_ORIGIN = 'http://localhost:5173';

describe('Приложение (e2e)', () => {
  let app: NestExpressApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS);
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => app.getHttpServer();

  describe('GET /api/v1/health', () => {
    it('отвечает 200 { status: ok } и выдаёт X-Request-Id', async () => {
      const res = await request(server()).get('/api/v1/health').expect(200);
      expect(res.body).toEqual({ status: 'ok' });
      expect(res.headers['x-request-id']).toMatch(UUID);
    });

    it('сохраняет корректный X-Request-Id клиента', async () => {
      const res = await request(server())
        .get('/api/v1/health')
        .set('X-Request-Id', 'client-req-0001')
        .expect(200);
      expect(res.headers['x-request-id']).toBe('client-req-0001');
    });

    it('заменяет небезопасный X-Request-Id', async () => {
      const res = await request(server())
        .get('/api/v1/health')
        .set('X-Request-Id', 'bad id with spaces')
        .expect(200);
      expect(res.headers['x-request-id']).toMatch(UUID);
    });

    it('без префикса /api/v1 маршрута нет', async () => {
      await request(server()).get('/health').expect(404);
    });
  });

  describe('единый формат ошибок', () => {
    it('неизвестный маршрут → 404 not_found с id запроса', async () => {
      const res = await request(server()).get('/api/v1/nope').expect(404);
      expect(res.body).toEqual({
        error: {
          code: 'not_found',
          message: expect.any(String),
          requestId: res.headers['x-request-id'],
        },
      });
    });

    it('некорректный JSON → 400 bad_request в общем формате', async () => {
      const res = await request(server())
        .post('/api/v1/health')
        .set('Content-Type', 'application/json')
        .send('{"broken":')
        .expect(400);
      expect(res.body.error.code).toBe('bad_request');
      expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
    });

    it('тело больше 64 КБ → 413 payload_too_large', async () => {
      const res = await request(server())
        .post('/api/v1/health')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ text: 'x'.repeat(70 * 1024) }))
        .expect(413);
      expect(res.body.error.code).toBe('payload_too_large');
      expect(res.body.error.requestId).toBe(res.headers['x-request-id']);
      expect(res.headers['x-request-id']).toMatch(UUID);
    });
  });

  describe('безопасность HTTP', () => {
    it('заголовки helmet есть, X-Powered-By нет', async () => {
      const res = await request(server()).get('/api/v1/health').expect(200);
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });

    it('CORS разрешает адрес фронтенда и нужные заголовки', async () => {
      const res = await request(server())
        .options('/api/v1/health')
        .set('Origin', ALLOWED_ORIGIN)
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'x-device-key,idempotency-key,content-type');
      expect(res.headers['access-control-allow-origin']).toBe(ALLOWED_ORIGIN);
      expect(res.headers['access-control-allow-headers']).toMatch(/X-Device-Key/i);
      expect(res.headers['access-control-allow-headers']).toMatch(/Idempotency-Key/i);
    });

    it('CORS не разрешает посторонний адрес', async () => {
      const res = await request(server())
        .get('/api/v1/health')
        .set('Origin', 'https://evil.example');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    });
  });

  describe('Swagger', () => {
    it('описание API доступно и содержит /api/v1/health и ключ устройства', async () => {
      const res = await request(server()).get('/api/docs-json').expect(200);
      expect(res.body.info.title).toBe('MILO API');
      expect(res.body.paths).toHaveProperty('/api/v1/health');
      expect(res.body.components.securitySchemes).toHaveProperty('device-key');
    });
  });
});

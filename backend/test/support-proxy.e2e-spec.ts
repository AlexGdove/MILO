import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';

import { resetRedis } from './support/redis.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { RATE_LIMIT_POLICIES } from '../src/modules/rate-limit/rate-limit.policies.js';
import { RedisService } from '../src/redis/redis.service.js';

/**
 * WebSocket `/support` за прокси, как на сервере (Caddy, `TRUST_PROXY=1`): лимит подключений
 * считается по IP клиента из `X-Forwarded-For`, а не по адресу прокси — иначе один клиент
 * исчерпывал бы общий лимит и отключал чат поддержки всем.
 */
describe('Поддержка за прокси (e2e, TRUST_PROXY=1)', () => {
  let app: NestExpressApplication;
  let baseUrl: string;
  const sockets: Socket[] = [];
  const previousTrustProxy = process.env.TRUST_PROXY;

  beforeAll(async () => {
    // Настройки читаются при загрузке AppModule — поэтому переменная задаётся до импорта
    process.env.TRUST_PROXY = '1';
    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS);
    configureApp(app);
    await app.listen(0);
    baseUrl = `http://localhost:${(app.getHttpServer().address() as { port: number }).port}`;
  });

  afterAll(async () => {
    await app.close();
    if (previousTrustProxy === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = previousTrustProxy;
  });

  beforeEach(async () => {
    await resetRedis(app.get(RedisService));
  });

  afterEach(() => {
    for (const socket of sockets.splice(0)) socket.close();
  });

  /** Подключение «через прокси»: Caddy дописывает IP клиента в X-Forwarded-For */
  const connectFrom = (ip: string) => {
    const socket = io(`${baseUrl}/support`, {
      transports: ['websocket'],
      auth: {},
      reconnection: false,
      extraHeaders: { 'X-Forwarded-For': ip },
    });
    sockets.push(socket);
    return socket;
  };
  const refused = (socket: Socket) =>
    new Promise<string>((resolve, reject) => {
      socket.once('connect', () => reject(new Error('connected')));
      socket.once('connect_error', (error) => resolve(error.message));
    });

  it('лимит одного клиента не мешает подключаться другим', async () => {
    for (let i = 0; i < RATE_LIMIT_POLICIES.supportConnect.limit; i++) {
      await refused(connectFrom('203.0.113.7'));
    }
    expect(await refused(connectFrom('203.0.113.7'))).toBe('rate_limited');
    // Другой клиент за тем же прокси доходит до проверки ключа, а не упирается в лимит
    expect(await refused(connectFrom('198.51.100.9'))).toBe('device_key_required');
  });

  it('подделка начала X-Forwarded-For не даёт нового счётчика', async () => {
    for (let i = 0; i < RATE_LIMIT_POLICIES.supportConnect.limit; i++) {
      await refused(connectFrom(`10.0.0.${i}, 203.0.113.7`));
    }
    expect(await refused(connectFrom('10.0.0.250, 203.0.113.7'))).toBe('rate_limited');
  });
});

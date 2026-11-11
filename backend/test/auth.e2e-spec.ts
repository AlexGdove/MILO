import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { resetData } from './support/db.js';
import { resetRedis } from './support/redis.js';
import { hashSessionToken } from '../src/modules/auth/auth-crypto.js';
import {
  LOGIN_CODE_MAX_ATTEMPTS,
  SESSION_TOUCH_INTERVAL_MS,
  SESSION_TTL_MS,
} from '../src/modules/auth/auth.config.js';
import { AuthService, EMAIL_CODE_LIMITS } from '../src/modules/auth/auth.service.js';
import { EmailSender } from '../src/modules/auth/email-sender.js';
import { CleanupService } from '../src/modules/maintenance/cleanup.service.js';
import { RATE_LIMIT_POLICIES } from '../src/modules/rate-limit/rate-limit.policies.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RedisService } from '../src/redis/redis.service.js';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Письма вместо почтового сервиса: последний код на каждую почту. */
class FakeEmailSender extends EmailSender {
  readonly codes = new Map<string, string>();
  sendLoginCode(email: string, code: string): Promise<void> {
    this.codes.set(email, code);
    return Promise.resolve();
  }
}

/** Аккаунты: вход по коду, сессии, удаление — на реальных PostgreSQL и Redis. */
describe('Аккаунты (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  const mail = new FakeEmailSender();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(EmailSender)
      .useValue(mail)
      .compile();
    app = moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS);
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    mail.codes.clear();
    await resetData(prisma);
    await resetRedis(app.get(RedisService));
  });

  const server = () => app.getHttpServer();
  const start = (email: string) =>
    request(server()).post('/api/v1/auth/email/start').send({ email });
  const verify = (email: string, code: string) =>
    request(server()).post('/api/v1/auth/email/verify').send({ email, code });
  const me = (token?: string) => {
    const req = request(server()).get('/api/v1/account/me');
    return token === undefined ? req : req.set('Authorization', `Bearer ${token}`);
  };
  /** Полный вход: код → токен */
  const login = async (email = 'anna@example.com'): Promise<Json> => {
    await start(email).expect(202);
    const code = mail.codes.get(email.trim().toLowerCase());
    return (await verify(email, code!).expect(200)).body as Json;
  };
  const wrongCode = (code: string) => (code === '000000' ? '000001' : '000000');

  describe('вход по коду', () => {
    it('код → токен, аккаунт создаётся при первом входе с тарифом free', async () => {
      const res = await start('Anna@Example.com').expect(202);
      expect(res.body).toEqual({ expiresInSeconds: 600 });
      const code = mail.codes.get('anna@example.com');
      expect(code).toMatch(/^\d{6}$/);

      const session = (await verify('anna@example.com', code!).expect(200)).body as Json;
      expect(session.token).toMatch(/^ms_[A-Za-z0-9_-]{43}$/);
      expect(session.account).toMatchObject({
        email: 'anna@example.com',
        plan: 'free',
        planUntil: null,
      });
      expect(await prisma.account.count()).toBe(1);

      const profile = await me(session.token as string).expect(200);
      expect(profile.body).toEqual(session.account);
    });

    it('повторный вход — тот же аккаунт, новая сессия', async () => {
      const first = await login();
      const second = await login('ANNA@example.com');
      expect(second.account.id).toBe(first.account.id);
      expect(second.token).not.toBe(first.token);
      expect(await prisma.session.count()).toBe(2);
    });

    it('в базе нет ни кода, ни токена в открытом виде', async () => {
      await start('anna@example.com').expect(202);
      const code = mail.codes.get('anna@example.com')!;
      const stored = await prisma.loginCode.findFirstOrThrow();
      expect(stored.codeHash).toMatch(/^[0-9a-f]{64}$/);
      expect(stored.codeHash).not.toContain(code);

      const { token } = (await verify('anna@example.com', code).expect(200)).body as Json;
      const session = await prisma.session.findFirstOrThrow();
      expect(session.tokenHash).toBe(hashSessionToken(token as string));
    });

    it('код одноразовый', async () => {
      await start('anna@example.com').expect(202);
      const code = mail.codes.get('anna@example.com')!;
      await verify('anna@example.com', code).expect(200);
      const again = await verify('anna@example.com', code).expect(401);
      expect(again.body.error.code).toBe('login_code_invalid');
    });

    it('новый код гасит прежний', async () => {
      await start('anna@example.com').expect(202);
      const old = mail.codes.get('anna@example.com')!;
      await start('anna@example.com').expect(202);
      const fresh = mail.codes.get('anna@example.com')!;
      if (old !== fresh) await verify('anna@example.com', old).expect(401);
      await verify('anna@example.com', fresh).expect(200);
    });

    it('код другой почты не подходит', async () => {
      await start('anna@example.com').expect(202);
      await start('boris@example.com').expect(202);
      const res = await verify('boris@example.com', mail.codes.get('anna@example.com')!);
      if (mail.codes.get('anna@example.com') !== mail.codes.get('boris@example.com')) {
        expect(res.status).toBe(401);
      }
    });

    it(`после ${LOGIN_CODE_MAX_ATTEMPTS} неверных попыток код сгорает, даже верный уже не принимается`, async () => {
      await start('anna@example.com').expect(202);
      const code = mail.codes.get('anna@example.com')!;
      for (let i = 0; i < LOGIN_CODE_MAX_ATTEMPTS; i++) {
        await verify('anna@example.com', wrongCode(code)).expect(401);
      }
      const res = await verify('anna@example.com', code).expect(401);
      expect(res.body.error.code).toBe('login_code_invalid');
      expect(await prisma.account.count()).toBe(0);
    });

    it('параллельный перебор не даёт больше попыток, чем положено', async () => {
      await start('anna@example.com').expect(202);
      const code = mail.codes.get('anna@example.com')!;
      await Promise.all(
        Array.from({ length: 12 }, () => verify('anna@example.com', wrongCode(code))),
      );
      const stored = await prisma.loginCode.findFirstOrThrow();
      expect(stored.attempts).toBeLessThanOrEqual(LOGIN_CODE_MAX_ATTEMPTS);
      await verify('anna@example.com', code).expect(401);
    });

    it('истёкший код не принимается', async () => {
      await start('anna@example.com').expect(202);
      await prisma.loginCode.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
      await verify('anna@example.com', mail.codes.get('anna@example.com')!).expect(401);
    });

    it('заблокированный аккаунт не входит', async () => {
      const { account } = await login();
      await prisma.account.update({
        where: { id: account.id as string },
        data: { blockedAt: new Date() },
      });
      await start('anna@example.com').expect(202);
      const res = await verify('anna@example.com', mail.codes.get('anna@example.com')!);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('account_blocked');
    });

    it.each([
      ['не почта', { email: 'anna' }],
      ['слишком длинная почта', { email: `${'a'.repeat(250)}@x.ru` }],
      ['лишнее поле', { email: 'anna@example.com', admin: true }],
    ])('%s → 400 validation_failed', async (_name, body) => {
      const res = await request(server()).post('/api/v1/auth/email/start').send(body).expect(400);
      expect(res.body.error.code).toBe('validation_failed');
    });

    it.each([['12345'], ['1234567'], ['abcdef']])(
      'код неверного формата %s → 400',
      async (code) => {
        await verify('anna@example.com', code).expect(400);
      },
    );
  });

  describe('лимиты', () => {
    it(`не больше ${EMAIL_CODE_LIMITS[0].limit} писем на одну почту за 15 минут`, async () => {
      for (let i = 0; i < EMAIL_CODE_LIMITS[0].limit; i++) {
        await start('anna@example.com').expect(202);
      }
      const res = await start('ANNA@example.com').expect(429);
      expect(res.body.error.code).toBe('rate_limited');
      // Другая почта не задета
      await start('boris@example.com').expect(202);
    });

    it(`запрос кода — не больше ${RATE_LIMIT_POLICIES.authStart.limit} в час с одного IP`, async () => {
      for (let i = 0; i < RATE_LIMIT_POLICIES.authStart.limit; i++) {
        await start(`user${i}@example.com`).expect(202);
      }
      await start('last@example.com').expect(429);
    });
  });

  describe('сессии', () => {
    it.each([
      ['без заголовка', undefined, 'session_required'],
      ['не токен', 'abc', 'session_invalid'],
      ['неизвестный токен', `ms_${'A'.repeat(43)}`, 'session_invalid'],
      ['ключ устройства вместо токена', `mk_${'A'.repeat(43)}`, 'session_invalid'],
    ])('%s → 401 %s', async (_name, token, code) => {
      const res = await me(token).expect(401);
      expect(res.body.error.code).toBe(code);
    });

    it('без «Bearer» → 401 session_invalid', async () => {
      const { token } = await login();
      const res = await request(server())
        .get('/api/v1/account/me')
        .set('Authorization', token as string)
        .expect(401);
      expect(res.body.error.code).toBe('session_invalid');
    });

    it('выход закрывает только текущую сессию', async () => {
      const first = await login();
      const second = await login();
      await request(server())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${first.token}`)
        .expect(204);
      await me(first.token as string).expect(401);
      await me(second.token as string).expect(200);
    });

    it('истёкшая сессия не действует', async () => {
      const { token } = await login();
      await prisma.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
      await me(token as string).expect(401);
    });

    it('блокировка аккаунта закрывает доступ по уже выданному токену', async () => {
      const { token, account } = await login();
      await prisma.account.update({
        where: { id: account.id as string },
        data: { blockedAt: new Date() },
      });
      await me(token as string).expect(401);
    });

    it('активность продлевает сессию не чаще раза в час', async () => {
      const { token } = await login();
      const auth = app.get(AuthService);
      const created = await prisma.session.findFirstOrThrow();

      await auth.resolveSession(token as string, new Date(created.lastSeenAt.getTime() + 60_000));
      expect((await prisma.session.findFirstOrThrow()).expiresAt).toEqual(created.expiresAt);

      const later = new Date(created.lastSeenAt.getTime() + SESSION_TOUCH_INTERVAL_MS);
      await auth.resolveSession(token as string, later);
      const touched = await prisma.session.findFirstOrThrow();
      expect(touched.expiresAt.getTime()).toBe(later.getTime() + SESSION_TTL_MS);
    });
  });

  describe('удаление аккаунта', () => {
    it('удаляет аккаунт, все сессии и коды его почты', async () => {
      const first = await login();
      await login();
      await start('anna@example.com').expect(202);
      await login('boris@example.com');

      await request(server())
        .delete('/api/v1/account/me')
        .set('Authorization', `Bearer ${first.token}`)
        .expect(204);

      expect(await prisma.account.findMany({ select: { email: true } })).toEqual([
        { email: 'boris@example.com' },
      ]);
      expect(await prisma.session.count()).toBe(1);
      expect(await prisma.loginCode.count({ where: { email: 'anna@example.com' } })).toBe(0);
      await me(first.token as string).expect(401);
    });
  });

  it('очистка удаляет истёкшие коды и закрытые или истёкшие сессии', async () => {
    const live = await login();
    const closed = await login();
    await request(server())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${closed.token}`)
      .expect(204);
    await start('boris@example.com').expect(202);
    const now = new Date(Date.now() + 11 * 60_000);

    const result = await app.get(CleanupService).run(now);

    expect(result).toMatchObject({ loginCodes: 3, sessions: 1 });
    expect(await prisma.loginCode.count()).toBe(0);
    await me(live.token as string).expect(200);
  });
});

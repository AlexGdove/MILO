import { randomUUID } from 'node:crypto';

import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { resetData } from './support/db.js';
import { resetRedis } from './support/redis.js';
import { AppException } from '../src/common/errors/app.exception.js';
import { hashDeviceKey } from '../src/modules/device-keys/device-key.js';
import { ModerationService } from '../src/modules/moderation/moderation.service.js';
import { RATE_LIMIT_POLICIES } from '../src/modules/rate-limit/rate-limit.policies.js';
import {
  SupportService,
  TICKET_CLOSED_EVENT,
  TICKET_CREATED_EVENT,
  TICKET_USER_MESSAGE_EVENT,
} from '../src/modules/support/support.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RedisService } from '../src/redis/redis.service.js';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Поддержка: REST и WebSocket на реальных PostgreSQL и Redis, сервер на случайном порту. */
describe('Поддержка (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let support: SupportService;
  let baseUrl: string;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestExpressApplication>(APP_OPTIONS);
    configureApp(app);
    // WebSocket нужен настоящий порт; REST-запросы supertest идут на тот же сервер
    await app.listen(0);
    baseUrl = `http://localhost:${(app.getHttpServer().address() as { port: number }).port}`;
    prisma = app.get(PrismaService);
    support = app.get(SupportService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetData(prisma);
    await resetRedis(app.get(RedisService));
  });

  afterEach(() => {
    for (const socket of sockets.splice(0)) socket.close();
  });

  const server = () => app.getHttpServer();
  const newKey = async (): Promise<string> =>
    ((await request(server()).post('/api/v1/device-keys').expect(201)).body as { key: string }).key;
  const keyId = async (key: string) =>
    (await prisma.deviceKey.findUniqueOrThrow({ where: { keyHash: hashDeviceKey(key) } })).id;
  const createTicket = async (key: string, text = 'Не сохраняется продукт'): Promise<Json> =>
    (
      await request(server())
        .post('/api/v1/support/tickets')
        .set('X-Device-Key', key)
        .send({ text })
        .expect(201)
    ).body as Json;
  const post = (key: string, path: string, body: Json = {}) =>
    request(server()).post(`/api/v1/support/tickets${path}`).set('X-Device-Key', key).send(body);
  const get = (key: string, path = '') =>
    request(server()).get(`/api/v1/support/tickets${path}`).set('X-Device-Key', key);
  const operator = (active = true) =>
    prisma.operator.create({
      data: {
        telegramUserId: BigInt(Math.floor(Math.random() * 1e12)),
        displayName: 'Анна',
        active,
      },
    });

  describe('обращения', () => {
    it('создание: номер, статус open, первое сообщение, событие для бота', async () => {
      const ticket = await createTicket(await newKey(), '  Помогите  ');
      expect(ticket).toMatchObject({ number: 1, status: 'open' });
      expect(ticket.messages).toEqual([
        {
          id: expect.any(String),
          author: 'user',
          operatorName: null,
          text: 'Помогите',
          createdAt: ticket.createdAt,
        },
      ]);
      expect(ticket.lastMessage).toEqual(ticket.messages[0]);
      const events = await prisma.outboxEvent.findMany();
      expect(events).toMatchObject([
        { type: TICKET_CREATED_EVENT, payload: { ticketId: ticket.id } },
      ]);
    });

    it('номера идут по порядку у всех устройств', async () => {
      const first = await createTicket(await newKey());
      const second = await createTicket(await newKey());
      expect([first.number, second.number]).toEqual([1, 2]);
    });

    it('список: только свои, по последней активности, с последним сообщением', async () => {
      const key = await newKey();
      const a = await createTicket(key, 'A');
      const b = await createTicket(key, 'B');
      await createTicket(await newKey(), 'Чужое');
      await post(key, `/${a.id}/messages`, { text: 'Ещё по A' }).expect(201);

      const res = await get(key).expect(200);
      expect((res.body.items as Json[]).map((t) => [t.id, t.lastMessage.text])).toEqual([
        [a.id, 'Ещё по A'],
        [b.id, 'B'],
      ]);
      expect(res.body.nextCursor).toBeNull();
    });

    it('список страницами по курсору без пропусков', async () => {
      const key = await newKey();
      const ids: string[] = [];
      for (let i = 0; i < 5; i++) ids.push((await createTicket(key, `№${i}`)).id as string);
      const seen: string[] = [];
      let cursor: string | null = null;
      do {
        const res = await get(key)
          .query({ limit: 2, ...(cursor ? { cursor } : {}) })
          .expect(200);
        seen.push(...(res.body.items as Json[]).map((t) => t.id as string));
        cursor = res.body.nextCursor as string | null;
      } while (cursor);
      expect(seen).toEqual([...ids].reverse());
    });

    it.each([
      ['чужое обращение', 'other'],
      ['нет такого', 'random'],
      ['не UUID', 'bad'],
    ])('%s → 404 ticket_not_found', async (_name, kind) => {
      const own = await newKey();
      const foreign = await createTicket(await newKey());
      const id = kind === 'other' ? foreign.id : kind === 'random' ? randomUUID() : 'abc';
      for (const res of [
        await get(own, `/${id}`),
        await get(own, `/${id}/messages`),
        await post(own, `/${id}/messages`, { text: 'x' }),
        await post(own, `/${id}/close`),
      ]) {
        expect(res.status).toBe(404);
        expect(res.body.error.code).toBe('ticket_not_found');
      }
    });

    it.each([
      ['пустой текст', { text: '   ' }],
      ['4001 символ', { text: 'а'.repeat(4001) }],
      ['без текста', {}],
      ['лишнее поле', { text: 'x', status: 'closed' }],
    ])('400 validation_failed: %s', async (_name, body) => {
      const res = await post(await newKey(), '', body);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('validation_failed');
      expect(await prisma.supportTicket.count()).toBe(0);
    });

    it('без ключа → 401', async () => {
      const res = await request(server()).post('/api/v1/support/tickets').send({ text: 'x' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('device_key_required');
    });

    it('заблокированный ключ может писать в поддержку (обжалование)', async () => {
      const key = await newKey();
      await app.get(ModerationService).blockDeviceKey((await operator()).id, await keyId(key));
      const ticket = await createTicket(key, 'Почему меня заблокировали?');
      await post(key, `/${ticket.id}/messages`, { text: 'Ещё вопрос' }).expect(201);
    });

    it(`лимит: ${RATE_LIMIT_POLICIES.ticketCreate.limit + 1}-е обращение за сутки → 429`, async () => {
      const key = await newKey();
      for (let i = 0; i < RATE_LIMIT_POLICIES.ticketCreate.limit; i++) await createTicket(key);
      const res = await post(key, '', { text: 'Ещё' });
      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('rate_limited');
    });

    it('Idempotency-Key: повтор создания → то же обращение', async () => {
      const key = await newKey();
      const idem = randomUUID();
      const send = () => post(key, '', { text: 'Один раз' }).set('Idempotency-Key', idem);
      const first = await send().expect(201);
      const second = await send().expect(201);
      expect(second.body).toEqual(first.body);
      expect(await prisma.supportTicket.count()).toBe(1);
    });
  });

  describe('сообщения и статусы', () => {
    it('сообщения по возрастанию времени; ?after= — только новые', async () => {
      const key = await newKey();
      const ticket = await createTicket(key, '1');
      const texts = ['2', '3', '4'];
      for (const text of texts) await post(key, `/${ticket.id}/messages`, { text }).expect(201);

      const all = await get(key, `/${ticket.id}/messages`).expect(200);
      const items = all.body.items as Json[];
      expect(items.map((m) => m.text)).toEqual(['1', '2', '3', '4']);

      const after = await get(key, `/${ticket.id}/messages`)
        .query({ after: items[1]?.id })
        .expect(200);
      expect((after.body.items as Json[]).map((m) => m.text)).toEqual(['3', '4']);

      const limited = await get(key, `/${ticket.id}/messages`).query({ limit: 2 }).expect(200);
      expect((limited.body.items as Json[]).map((m) => m.text)).toEqual(['1', '2']);
    });

    it('after — сообщение другого обращения → 400 validation_failed', async () => {
      const key = await newKey();
      const a = await createTicket(key);
      const b = await createTicket(key);
      const res = await get(key, `/${a.id}/messages`).query({ after: b.lastMessage.id });
      expect(res.status).toBe(400);
      expect(res.body.error.details).toEqual([
        { field: 'after', message: 'after must be a message of this ticket' },
      ]);
    });

    it('сообщение пользователя → событие для бота; закрытое переоткрывается', async () => {
      const key = await newKey();
      const ticket = await createTicket(key);
      const closed = await post(key, `/${ticket.id}/close`).expect(200);
      expect(closed.body.status).toBe('closed');

      const message = await post(key, `/${ticket.id}/messages`, { text: 'Снова' }).expect(201);
      expect(message.body).toMatchObject({ author: 'user', text: 'Снова', operatorName: null });
      expect((await get(key, `/${ticket.id}`).expect(200)).body.status).toBe('open');

      const types = (await prisma.outboxEvent.findMany({ orderBy: { createdAt: 'asc' } })).map(
        (e) => e.type,
      );
      expect(types).toEqual([TICKET_CREATED_EVENT, TICKET_CLOSED_EVENT, TICKET_USER_MESSAGE_EVENT]);
    });

    it('повторное закрытие ничего не меняет и не пишет событие', async () => {
      const key = await newKey();
      const ticket = await createTicket(key);
      await post(key, `/${ticket.id}/close`).expect(200);
      await post(key, `/${ticket.id}/close`).expect(200);
      expect(await prisma.outboxEvent.count({ where: { type: TICKET_CLOSED_EVENT } })).toBe(1);
    });

    it('ответ оператора: статус answered, имя оператора; пользователь отвечает → open', async () => {
      const key = await newKey();
      const ticket = await createTicket(key);
      const op = await operator();
      const reply = await support.addOperatorReply(
        op.id,
        ticket.id as string,
        '  Сейчас поможем  ',
      );
      expect(reply).toMatchObject({
        author: 'operator',
        operatorName: 'Анна',
        text: 'Сейчас поможем',
      });
      expect((await get(key, `/${ticket.id}`).expect(200)).body).toMatchObject({
        status: 'answered',
        lastMessage: { author: 'operator', operatorName: 'Анна' },
      });
      await post(key, `/${ticket.id}/messages`, { text: 'Спасибо' }).expect(201);
      expect((await get(key, `/${ticket.id}`).expect(200)).body.status).toBe('open');
    });

    it('неактивный оператор → operator_inactive; нет обращения → ticket_not_found', async () => {
      const ticket = await createTicket(await newKey());
      const inactive: unknown = await support
        .addOperatorReply((await operator(false)).id, ticket.id as string, 'x')
        .catch((e: unknown) => e);
      expect((inactive as AppException).code).toBe('operator_inactive');
      const missing: unknown = await support
        .addOperatorReply((await operator()).id, randomUUID(), 'x')
        .catch((e: unknown) => e);
      expect((missing as AppException).code).toBe('ticket_not_found');
      expect(await prisma.supportMessage.count()).toBe(1);
    });
  });

  describe('WebSocket /support', () => {
    const connect = (deviceKey?: string) => {
      const socket = io(`${baseUrl}/support`, {
        transports: ['websocket'],
        auth: deviceKey === undefined ? {} : { deviceKey },
        reconnection: false,
      });
      sockets.push(socket);
      return socket;
    };
    const connected = (socket: Socket) =>
      new Promise<void>((resolve, reject) => {
        socket.once('connect', () => resolve());
        socket.once('connect_error', reject);
      });
    const refused = (socket: Socket) =>
      new Promise<string>((resolve, reject) => {
        socket.once('connect', () => reject(new Error('connected')));
        socket.once('connect_error', (error) => resolve(error.message));
      });
    const nextEvent = (socket: Socket, name: string) =>
      new Promise<Json>((resolve) => socket.once(name, (data: Json) => resolve(data)));

    it('своё сообщение и ответ оператора приходят событиями', async () => {
      const key = await newKey();
      const ticket = await createTicket(key);
      const socket = connect(key);
      await connected(socket);

      const created = nextEvent(socket, 'message.created');
      const updated = nextEvent(socket, 'ticket.updated');
      await post(key, `/${ticket.id}/messages`, { text: 'Через WS' }).expect(201);
      expect(await created).toMatchObject({ ticketId: ticket.id, message: { text: 'Через WS' } });
      expect(await updated).toMatchObject({ ticketId: ticket.id, status: 'open' });

      const reply = nextEvent(socket, 'message.created');
      const answered = nextEvent(socket, 'ticket.updated');
      await support.addOperatorReply((await operator()).id, ticket.id as string, 'Ответ');
      expect(await reply).toMatchObject({
        ticketId: ticket.id,
        message: { author: 'operator', operatorName: 'Анна', text: 'Ответ' },
      });
      expect(await answered).toMatchObject({ status: 'answered' });
    });

    it('другое устройство событий чужого обращения не получает', async () => {
      const key = await newKey();
      const ticket = await createTicket(key);
      const stranger = connect(await newKey());
      await connected(stranger);
      const received: string[] = [];
      stranger.onAny((event: string) => received.push(event));

      const own = connect(key);
      await connected(own);
      const delivered = nextEvent(own, 'message.created');
      await post(key, `/${ticket.id}/messages`, { text: 'Тайна' }).expect(201);
      await delivered;
      expect(received).toEqual([]);
    });

    it.each([
      ['без ключа', undefined, 'device_key_required'],
      ['неверный формат', 'bad', 'device_key_invalid'],
      ['неизвестный ключ', `mk_${'A'.repeat(43)}`, 'device_key_invalid'],
    ])('%s → отказ при подключении (%s)', async (_name, deviceKey, code) => {
      expect(await refused(connect(deviceKey))).toBe(code);
    });

    it(`подключений больше ${RATE_LIMIT_POLICIES.supportConnect.limit} в минуту с IP → rate_limited`, async () => {
      for (let i = 0; i < RATE_LIMIT_POLICIES.supportConnect.limit; i++) {
        await refused(connect());
      }
      expect(await refused(connect())).toBe('rate_limited');
    });
  });
});

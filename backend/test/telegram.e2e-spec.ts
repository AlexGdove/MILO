import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { AppModule } from '../src/app.module.js';
import { APP_OPTIONS, configureApp } from '../src/app.setup.js';
import { resetData } from './support/db.js';
import { FakeBotApi } from './support/fake-bot-api.js';
import { resetRedis } from './support/redis.js';
import { CleanupService } from '../src/modules/maintenance/cleanup.service.js';
import { OutboxWorker } from '../src/modules/outbox/outbox.worker.js';
import { SUBMISSION_REVIEW_EVENT } from '../src/modules/products/products.service.js';
import type { Update } from '../src/modules/telegram/bot-api.js';
import { encodeCallback } from '../src/modules/telegram/callback-data.js';
import { ModerationBotService } from '../src/modules/telegram/moderation-bot.service.js';
import { SupportBotService } from '../src/modules/telegram/support-bot.service.js';
import { TELEGRAM_BOTS, type TelegramBots } from '../src/modules/telegram/telegram.tokens.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { RedisService } from '../src/redis/redis.service.js';

const SUPPORT_CHAT = -1001;
const MODERATION_CHAT = -1002;
const OPERATOR_TG = 555001;
const STRANGER_TG = 555999;

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Боты на реальных PostgreSQL и Redis; Telegram заменён записью вызовов (`FakeBotApi`). */
describe('Telegram-боты (e2e)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let outbox: OutboxWorker;
  let supportBot: SupportBotService;
  let moderationBot: ModerationBotService;
  const supportApi = new FakeBotApi();
  const moderationApi = new FakeBotApi();
  let updateId = 1;
  /** Тот же объект получают сервисы: тесты тем меняют в нём чат и тему */
  const bots: TelegramBots = {
    support: { api: supportApi, chatId: SUPPORT_CHAT, threadId: null },
    moderation: { api: moderationApi, chatId: MODERATION_CHAT, threadId: null },
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
    supportBot = app.get(SupportBotService);
    moderationBot = app.get(ModerationBotService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetData(prisma);
    await resetRedis(app.get(RedisService));
    supportApi.reset();
    moderationApi.reset();
  });

  const server = () => app.getHttpServer();
  const newKey = async (): Promise<string> =>
    ((await request(server()).post('/api/v1/device-keys').expect(201)).body as { key: string }).key;
  const createTicket = async (key: string, text = 'Не сохраняется продукт'): Promise<Json> =>
    (
      await request(server())
        .post('/api/v1/support/tickets')
        .set('X-Device-Key', key)
        .send({ text })
        .expect(201)
    ).body as Json;
  const addOperator = (telegramUserId = OPERATOR_TG, active = true) =>
    prisma.operator.create({
      data: { telegramUserId: BigInt(telegramUserId), displayName: 'Анна', active },
    });
  /** Сообщение в группе операторов в ответ (reply) на сообщение бота. */
  const replyUpdate = (
    replyTo: { messageId: number; text: string },
    text: string | undefined,
    from = OPERATOR_TG,
    chatId = SUPPORT_CHAT,
    threadId?: number,
  ): Update =>
    ({
      update_id: updateId++,
      message: {
        message_id: 50_000 + updateId,
        date: 0,
        chat: { id: chatId, type: 'supergroup', title: 'MILO — поддержка' },
        ...(threadId !== undefined && { message_thread_id: threadId, is_topic_message: true }),
        from: { id: from, is_bot: false, first_name: 'Анна' },
        ...(text !== undefined && { text }),
        reply_to_message: {
          message_id: replyTo.messageId,
          date: 0,
          chat: { id: chatId, type: 'supergroup', title: 'MILO — поддержка' },
          from: { id: 1, is_bot: true, first_name: 'MILO' },
          text: replyTo.text,
        },
      },
    }) as unknown as Update;
  const pressUpdate = (
    data: string,
    messageId: number,
    from = OPERATOR_TG,
    chatId = MODERATION_CHAT,
    threadId?: number,
  ) =>
    ({
      update_id: updateId++,
      callback_query: {
        id: `cb-${updateId}`,
        chat_instance: 'x',
        from: { id: from, is_bot: false, first_name: 'Анна' },
        data,
        message: {
          message_id: messageId,
          date: 0,
          chat: { id: chatId, type: 'supergroup', title: 'MILO — модерация' },
          ...(threadId !== undefined && { message_thread_id: threadId, is_topic_message: true }),
        },
      },
    }) as unknown as Update;

  describe('бот поддержки', () => {
    it('новое обращение — «Обращение № 1» с текстом в чат операторов', async () => {
      await createTicket(await newKey(), 'Не сохраняется продукт');
      expect(await outbox.processBatch()).toBe(1);

      expect(supportApi.sent).toHaveLength(1);
      const [sent] = supportApi.sent;
      expect(sent?.chatId).toBe(SUPPORT_CHAT);
      expect(sent?.text).toContain('🆘 Обращение № 1');
      expect(sent?.text).toContain('Не сохраняется продукт');
      const event = await prisma.outboxEvent.findFirstOrThrow();
      expect(event.processedAt).not.toBeNull();
      expect(event.attempts).toBe(1);
      // Повторная пачка ничего не отправляет
      expect(await outbox.processBatch()).toBe(0);
      expect(supportApi.sent).toHaveLength(1);
    });

    it('ответ оператора (reply) — сообщение пользователю, статус answered, реакция 👍', async () => {
      const key = await newKey();
      const ticket = await createTicket(key);
      await addOperator();
      await outbox.processBatch();
      const root = supportApi.sent[0]!;

      await supportBot.handleUpdate(replyUpdate(root, '  Обновите приложение  '));

      const messages = await request(server())
        .get(`/api/v1/support/tickets/${ticket.id as string}/messages`)
        .set('X-Device-Key', key)
        .expect(200);
      const items = (messages.body as Json).items as Json[];
      expect(items.map((m) => [m.author, m.text])).toEqual([
        ['user', 'Не сохраняется продукт'],
        ['operator', 'Обновите приложение'],
      ]);
      const saved = await prisma.supportTicket.findUniqueOrThrow({ where: { id: ticket.id } });
      expect(saved.status).toBe('answered');
      expect(supportApi.reactions).toHaveLength(1);
    });

    it('повтор того же обновления Telegram не дублирует ответ', async () => {
      await createTicket(await newKey());
      await addOperator();
      await outbox.processBatch();
      const update = replyUpdate(supportApi.sent[0]!, 'Ответ');

      await supportBot.handleUpdate(update);
      await supportBot.handleUpdate(update);

      expect(await prisma.supportMessage.count({ where: { author: 'operator' } })).toBe(1);
    });

    it('не оператор — ответ не сохраняется, бот называет его Telegram ID', async () => {
      await createTicket(await newKey());
      await addOperator(STRANGER_TG, false);
      await outbox.processBatch();

      await supportBot.handleUpdate(replyUpdate(supportApi.sent[0]!, 'Ответ', STRANGER_TG));

      expect(await prisma.supportMessage.count({ where: { author: 'operator' } })).toBe(0);
      expect(supportApi.sent.at(-1)?.text).toContain(
        `Нет прав оператора. Ваш Telegram ID: ${STRANGER_TG}`,
      );
    });

    it('не текст (фото) — подсказка, ничего не сохраняется', async () => {
      await createTicket(await newKey());
      await addOperator();
      await outbox.processBatch();

      await supportBot.handleUpdate(replyUpdate(supportApi.sent[0]!, undefined));

      expect(await prisma.supportMessage.count({ where: { author: 'operator' } })).toBe(0);
      expect(supportApi.sent.at(-1)?.text).toBe('Пока можно отправить только текст.');
    });

    it('сообщения в другом чате и без reply бот не обрабатывает', async () => {
      await createTicket(await newKey());
      await addOperator();
      await outbox.processBatch();
      const root = supportApi.sent[0]!;

      await supportBot.handleUpdate(replyUpdate(root, 'Ответ', OPERATOR_TG, -999));
      await supportBot.handleUpdate(replyUpdate({ messageId: 1, text: 'Привет' }, 'Ответ'));

      expect(await prisma.supportMessage.count({ where: { author: 'operator' } })).toBe(0);
      expect(supportApi.sent).toHaveLength(1);
    });

    it('новые сообщения пользователя и закрытие — ответами на «Обращение № N»', async () => {
      const key = await newKey();
      const ticket = await createTicket(key);
      await outbox.processBatch();
      const root = supportApi.sent[0]!;

      await request(server())
        .post(`/api/v1/support/tickets/${ticket.id as string}/messages`)
        .set('X-Device-Key', key)
        .send({ text: 'Ещё вопрос' })
        .expect(201);
      await request(server())
        .post(`/api/v1/support/tickets/${ticket.id as string}/close`)
        .set('X-Device-Key', key)
        .expect(200);
      expect(await outbox.processBatch()).toBe(2);

      const [message, closed] = supportApi.sent.slice(1);
      expect(message?.text).toBe('💬 Обращение № 1 — пользователь:\n\nЕщё вопрос');
      expect(message?.options.replyTo).toBe(root.messageId);
      expect(closed?.text).toBe('✔️ Обращение № 1 закрыто пользователем.');
      expect(closed?.options.replyTo).toBe(root.messageId);
    });

    it('ответ оператора на сообщение пользователя в ветке тоже попадает в обращение', async () => {
      const key = await newKey();
      const ticket = await createTicket(key);
      await addOperator();
      await request(server())
        .post(`/api/v1/support/tickets/${ticket.id as string}/messages`)
        .set('X-Device-Key', key)
        .send({ text: 'Ещё вопрос' })
        .expect(201);
      await outbox.processBatch();

      await supportBot.handleUpdate(replyUpdate(supportApi.sent[1]!, 'Ответ на второй'));

      const reply = await prisma.supportMessage.findFirstOrThrow({ where: { author: 'operator' } });
      expect(reply.ticketId).toBe(ticket.id);
    });

    it('сбой Telegram — повтор позже, с паузой; токен в ошибку не попадает', async () => {
      await createTicket(await newKey());
      supportApi.failNextSend = new Error(
        'Network request for https://api.telegram.org/bot123456:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA/sendMessage failed',
      );
      const now = new Date();

      expect(await outbox.processBatch(now)).toBe(0);
      const failed = await prisma.outboxEvent.findFirstOrThrow();
      expect(failed.processedAt).toBeNull();
      expect(failed.attempts).toBe(1);
      expect(failed.lastError).toContain('<token>');
      expect(failed.lastError).not.toContain('AAAAAAAA');
      expect(failed.availableAt.getTime()).toBe(now.getTime() + 10_000);

      // До конца паузы событие не берётся, после — отправляется
      expect(await outbox.processBatch(new Date(now.getTime() + 5_000))).toBe(0);
      expect(await outbox.processBatch(new Date(now.getTime() + 10_000))).toBe(1);
      expect(supportApi.sent).toHaveLength(1);
    });

    it('сообщение пользователя без отправленного «Обращения» — сначала отправляется оно', async () => {
      const key = await newKey();
      const ticket = await createTicket(key);
      await prisma.outboxEvent.updateMany({ data: { processedAt: new Date() } });
      await request(server())
        .post(`/api/v1/support/tickets/${ticket.id as string}/messages`)
        .set('X-Device-Key', key)
        .send({ text: 'Ещё вопрос' })
        .expect(201);

      await outbox.processBatch();

      expect(supportApi.sent.map((m) => m.text.split('\n')[0])).toEqual([
        '🆘 Обращение № 1',
        '💬 Обращение № 1 — пользователь:',
      ]);
      expect(supportApi.sent[1]?.options.replyTo).toBe(supportApi.sent[0]?.messageId);
    });

    it('ответ на обращение удалённого устройства — сообщение оператору', async () => {
      const key = await newKey();
      await createTicket(key);
      await addOperator();
      await outbox.processBatch();
      await request(server()).delete('/api/v1/device-keys/me').set('X-Device-Key', key).expect(204);

      await supportBot.handleUpdate(replyUpdate(supportApi.sent[0]!, 'Ответ'));

      expect(supportApi.sent.at(-1)?.text).toContain('Обращение не найдено');
    });

    it('/id — номер чата и Telegram ID отправителя', async () => {
      await supportBot.handleUpdate({
        update_id: updateId++,
        message: {
          message_id: 7,
          date: 0,
          chat: { id: -100777, type: 'group', title: 'Новая группа' },
          from: { id: OPERATOR_TG, is_bot: false, first_name: 'Анна' },
          text: '/id@milo_support_bot',
        },
      } as unknown as Update);

      expect(supportApi.sent).toEqual([
        {
          chatId: -100777,
          messageId: expect.any(Number) as number,
          text: `ID чата: -100777\nВаш Telegram ID: ${OPERATOR_TG}`,
          options: { replyTo: 7 },
        },
      ]);
    });
  });

  describe('бот модерации', () => {
    const pendingSubmission = async () => {
      const key = await prisma.deviceKey.create({ data: { keyHash: 'a'.repeat(64) } });
      const submission = await prisma.productSubmission.create({
        data: {
          deviceKeyId: key.id,
          name: 'Йогурт',
          brand: 'Простоквашино',
          unit: 'g',
          kcal: 60,
          protein: 3,
          fat: 2.5,
          carbs: 4,
          flags: ['name_conflict'],
          createdAt: new Date(),
        },
      });
      await prisma.outboxEvent.create({
        data: { type: SUBMISSION_REVIEW_EVENT, payload: { submissionId: submission.id } },
      });
      await outbox.processBatch();
      const card = moderationApi.sent[0]!;
      return { submission, card, deviceKeyId: key.id };
    };

    it('предложение на проверку — карточка с кнопками в чат модерации', async () => {
      const { submission, card } = await pendingSubmission();

      expect(card.chatId).toBe(MODERATION_CHAT);
      expect(card.text).toContain('Йогурт');
      expect(card.text).toContain('Замечания: похожий продукт уже есть');
      expect(card.options.buttons?.flat().map((b) => b.data)).toEqual([
        encodeCallback('approve', submission.id),
        encodeCallback('reject', submission.id),
        encodeCallback('block', submission.id),
      ]);
    });

    it('«Принять» — продукт в общей базе, карточка с итогом без кнопок', async () => {
      const { submission, card } = await pendingSubmission();
      await addOperator();

      await moderationBot.handleUpdate(
        pressUpdate(encodeCallback('approve', submission.id), card.messageId),
      );

      const saved = await prisma.productSubmission.findUniqueOrThrow({
        where: { id: submission.id },
      });
      expect(saved.status).toBe('approved');
      expect(saved.reviewedBy).toBe('operator');
      expect(await prisma.product.count({ where: { name: 'Йогурт' } })).toBe(1);
      expect(await prisma.moderationAction.count({ where: { action: 'approve_submission' } })).toBe(
        1,
      );
      const [edit] = moderationApi.edited;
      expect(edit?.messageId).toBe(card.messageId);
      expect(edit?.text).toContain('✅ Принято — Анна');
      expect(edit?.buttons).toBeUndefined();
      expect(moderationApi.answers.at(-1)?.text).toBe('Принято в общую базу');
    });

    it('не оператор — решение не принимается, окно с Telegram ID', async () => {
      const { submission, card } = await pendingSubmission();

      await moderationBot.handleUpdate(
        pressUpdate(encodeCallback('approve', submission.id), card.messageId, STRANGER_TG),
      );

      const saved = await prisma.productSubmission.findUniqueOrThrow({
        where: { id: submission.id },
      });
      expect(saved.status).toBe('pending');
      expect(moderationApi.answers.at(-1)).toEqual({
        id: expect.any(String) as string,
        text: expect.stringContaining(`${STRANGER_TG}`) as string,
        alert: true,
      });
    });

    it('«Заблокировать» — отклонено, ключ заблокирован; «Разблокировать» снимает блокировку', async () => {
      const { submission, card, deviceKeyId } = await pendingSubmission();
      await addOperator();

      await moderationBot.handleUpdate(
        pressUpdate(encodeCallback('block', submission.id), card.messageId),
      );

      const blocked = await prisma.deviceKey.findUniqueOrThrow({ where: { id: deviceKeyId } });
      expect(blocked.blockedAt).not.toBeNull();
      const rejected = await prisma.productSubmission.findUniqueOrThrow({
        where: { id: submission.id },
      });
      expect(rejected.status).toBe('rejected');
      expect(
        moderationApi.edited
          .at(-1)
          ?.buttons?.flat()
          .map((b) => b.data),
      ).toEqual([encodeCallback('unblock', submission.id)]);

      await moderationBot.handleUpdate(
        pressUpdate(encodeCallback('unblock', submission.id), card.messageId),
      );

      const unblocked = await prisma.deviceKey.findUniqueOrThrow({ where: { id: deviceKeyId } });
      expect(unblocked.blockedAt).toBeNull();
      expect(moderationApi.edited.at(-1)?.text).toContain('↩️ Устройство разблокировано — Анна');
    });

    it('повторное нажатие после решения — «Уже решено», без второго действия', async () => {
      const { submission, card } = await pendingSubmission();
      await addOperator();

      await moderationBot.handleUpdate(
        pressUpdate(encodeCallback('reject', submission.id), card.messageId),
      );
      await moderationBot.handleUpdate(
        pressUpdate(encodeCallback('approve', submission.id), card.messageId),
      );

      const saved = await prisma.productSubmission.findUniqueOrThrow({
        where: { id: submission.id },
      });
      expect(saved.status).toBe('rejected');
      expect(await prisma.product.count()).toBe(0);
      expect(moderationApi.answers.at(-1)?.text).toBe('Уже решено');
    });

    it('нажатие в чужом чате или с испорченными данными — «Недоступно»', async () => {
      const { submission, card } = await pendingSubmission();
      await addOperator();

      await moderationBot.handleUpdate(
        pressUpdate(encodeCallback('approve', submission.id), card.messageId, OPERATOR_TG, -999),
      );
      await moderationBot.handleUpdate(pressUpdate('x:garbage', card.messageId));

      const saved = await prisma.productSubmission.findUniqueOrThrow({
        where: { id: submission.id },
      });
      expect(saved.status).toBe('pending');
      expect(moderationApi.answers.map((a) => a.text)).toEqual(['Недоступно', 'Недоступно']);
    });

    it('уже решённое до отправки предложение карточкой не приходит', async () => {
      const key = await prisma.deviceKey.create({ data: { keyHash: 'b'.repeat(64) } });
      const submission = await prisma.productSubmission.create({
        data: {
          deviceKeyId: key.id,
          name: 'Кефир',
          unit: 'ml',
          kcal: 50,
          protein: 3,
          fat: 2.5,
          carbs: 4,
          status: 'rejected',
          reviewedBy: 'auto',
          reviewedAt: new Date(),
          createdAt: new Date(),
        },
      });
      await prisma.outboxEvent.create({
        data: { type: SUBMISSION_REVIEW_EVENT, payload: { submissionId: submission.id } },
      });

      expect(await outbox.processBatch()).toBe(1);
      expect(moderationApi.sent).toHaveLength(0);
    });
  });

  describe('одна группа с темами (B-23)', () => {
    const GROUP = -100500;
    const SUPPORT_TOPIC = 77;
    const MODERATION_TOPIC = 88;

    beforeEach(() => {
      bots.support = { api: supportApi, chatId: GROUP, threadId: SUPPORT_TOPIC };
      bots.moderation = { api: moderationApi, chatId: GROUP, threadId: MODERATION_TOPIC };
    });

    afterEach(() => {
      bots.support = { api: supportApi, chatId: SUPPORT_CHAT, threadId: null };
      bots.moderation = { api: moderationApi, chatId: MODERATION_CHAT, threadId: null };
    });

    it('обращение и ответы в ветке — в теме поддержки', async () => {
      const key = await newKey();
      const ticket = await createTicket(key);
      await request(server())
        .post(`/api/v1/support/tickets/${ticket.id as string}/messages`)
        .set('X-Device-Key', key)
        .send({ text: 'Ещё вопрос' })
        .expect(201);
      await outbox.processBatch();

      expect(supportApi.sent.map((m) => [m.chatId, m.options.threadId])).toEqual([
        [GROUP, SUPPORT_TOPIC],
        [GROUP, SUPPORT_TOPIC],
      ]);
    });

    it('ответ оператора в теме поддержки сохраняется, из другой темы — нет', async () => {
      await createTicket(await newKey());
      await addOperator();
      await outbox.processBatch();
      const root = supportApi.sent[0]!;

      await supportBot.handleUpdate(
        replyUpdate(root, 'Не отсюда', OPERATOR_TG, GROUP, MODERATION_TOPIC),
      );
      expect(await prisma.supportMessage.count({ where: { author: 'operator' } })).toBe(0);

      await supportBot.handleUpdate(replyUpdate(root, 'Ответ', OPERATOR_TG, GROUP, SUPPORT_TOPIC));
      expect(await prisma.supportMessage.count({ where: { author: 'operator' } })).toBe(1);
    });

    it('карточка модерации — в теме модерации; кнопка работает только оттуда', async () => {
      const key = await prisma.deviceKey.create({ data: { keyHash: 'e'.repeat(64) } });
      const submission = await prisma.productSubmission.create({
        data: {
          deviceKeyId: key.id,
          name: 'Сырок',
          unit: 'pcs',
          pieceWeight: 40,
          kcal: 400,
          protein: 8,
          fat: 25,
          carbs: 30,
          flags: ['energy_mismatch'],
          createdAt: new Date(),
        },
      });
      await prisma.outboxEvent.create({
        data: { type: SUBMISSION_REVIEW_EVENT, payload: { submissionId: submission.id } },
      });
      await addOperator();
      await outbox.processBatch();
      const card = moderationApi.sent[0]!;
      expect([card.chatId, card.options.threadId]).toEqual([GROUP, MODERATION_TOPIC]);

      const approve = encodeCallback('approve', submission.id);
      await moderationBot.handleUpdate(
        pressUpdate(approve, card.messageId, OPERATOR_TG, GROUP, SUPPORT_TOPIC),
      );
      expect(moderationApi.answers.at(-1)?.text).toBe('Недоступно');

      await moderationBot.handleUpdate(
        pressUpdate(approve, card.messageId, OPERATOR_TG, GROUP, MODERATION_TOPIC),
      );
      const saved = await prisma.productSubmission.findUniqueOrThrow({
        where: { id: submission.id },
      });
      expect(saved.status).toBe('approved');
    });

    it('/id в теме — номер чата, темы и Telegram ID, ответ в ту же тему', async () => {
      await moderationBot.handleUpdate({
        update_id: updateId++,
        message: {
          message_id: 9,
          date: 0,
          chat: { id: GROUP, type: 'supergroup', title: 'MILO', is_forum: true },
          message_thread_id: MODERATION_TOPIC,
          is_topic_message: true,
          from: { id: OPERATOR_TG, is_bot: false, first_name: 'Анна' },
          text: '/id',
        },
      } as unknown as Update);

      expect(moderationApi.sent.at(-1)).toMatchObject({
        chatId: GROUP,
        text: `ID чата: ${GROUP}\nID темы: ${MODERATION_TOPIC}\nВаш Telegram ID: ${OPERATOR_TG}`,
        options: { replyTo: 9, threadId: MODERATION_TOPIC },
      });
    });
  });

  describe('очистка', () => {
    it('удаляет устаревшие служебные строки, свежие и неотправленные оставляет', async () => {
      const now = new Date();
      const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60_000);
      await prisma.telegramUpdate.createMany({
        data: [
          { bot: 'support', updateId: 1n, receivedAt: daysAgo(8) },
          { bot: 'moderation', updateId: 1n, receivedAt: daysAgo(1) },
        ],
      });
      await prisma.outboxEvent.createMany({
        data: [
          { type: 'old', payload: {}, processedAt: daysAgo(31) },
          { type: 'recent', payload: {}, processedAt: daysAgo(2) },
          { type: 'pending', payload: {}, createdAt: daysAgo(60) },
        ],
      });
      const key = await prisma.deviceKey.create({ data: { keyHash: 'c'.repeat(64) } });
      await prisma.idempotencyKey.createMany({
        data: [
          {
            deviceKeyId: key.id,
            key: 'old',
            requestHash: 'd'.repeat(64),
            statusCode: 201,
            response: {},
            createdAt: daysAgo(2),
          },
          {
            deviceKeyId: key.id,
            key: 'new',
            requestHash: 'd'.repeat(64),
            statusCode: 201,
            response: {},
          },
        ],
      });

      const result = await app.get(CleanupService).run(now);

      expect(result).toEqual({
        telegramUpdates: 1,
        idempotencyKeys: 1,
        outboxEvents: 1,
        clientErrors: 0,
      });
      expect((await prisma.outboxEvent.findMany()).map((e) => e.type).sort()).toEqual([
        'pending',
        'recent',
      ]);
      expect(await prisma.telegramUpdate.count()).toBe(1);
      expect((await prisma.idempotencyKey.findMany()).map((k) => k.key)).toEqual(['new']);
    });
  });
});

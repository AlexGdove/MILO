import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { OUTBOX_MAX_ATTEMPTS, retryDelayMs, safeErrorMessage } from './outbox.retry.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../prisma/prisma.service.js';

/** Обработчик события: бросает ошибку — событие повторится позже. */
export type OutboxHandler = (payload: Prisma.JsonValue) => Promise<void>;

const POLL_INTERVAL_MS = 3_000;
const BATCH_SIZE = 20;

/**
 * Фоновая отправка событий outbox (ADR-0003): по порядку записи, «хотя бы один раз».
 * Обработчики регистрируют модули-получатели (боты); события без обработчика ждут — например,
 * пока не настроен бот. Работает в одном экземпляре сервера (B-21): пачки не пересекаются
 * внутри процесса. В тестах таймер не запускается — пачку вызывают явно (`processBatch`).
 */
@Injectable()
export class OutboxWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorker.name);
  private readonly handlers = new Map<string, OutboxHandler>();
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  register(type: string, handler: OutboxHandler): void {
    this.handlers.set(type, handler);
  }

  onApplicationBootstrap(): void {
    if (this.config.get('NODE_ENV') === 'test') return;
    this.timer = setInterval(() => {
      this.processBatch().catch((error: unknown) =>
        this.logger.error({ err: safeErrorMessage(error) }, 'Outbox batch failed'),
      );
    }, POLL_INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  /** Одна пачка готовых к отправке событий; возвращает число успешно обработанных. */
  async processBatch(now = new Date()): Promise<number> {
    if (this.running || this.handlers.size === 0) return 0;
    this.running = true;
    try {
      const events = await this.prisma.outboxEvent.findMany({
        where: {
          processedAt: null,
          type: { in: [...this.handlers.keys()] },
          attempts: { lt: OUTBOX_MAX_ATTEMPTS },
          availableAt: { lte: now },
        },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        take: BATCH_SIZE,
      });
      let done = 0;
      for (const event of events) {
        const handler = this.handlers.get(event.type);
        if (!handler) continue;
        const attempts = event.attempts + 1;
        try {
          await handler(event.payload);
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: { processedAt: new Date(), attempts, lastError: null },
          });
          done += 1;
        } catch (error) {
          const lastError = safeErrorMessage(error);
          await this.prisma.outboxEvent.update({
            where: { id: event.id },
            data: {
              attempts,
              lastError,
              availableAt: new Date(now.getTime() + retryDelayMs(attempts)),
            },
          });
          this.logger.warn(
            { eventId: event.id, type: event.type, attempts, err: lastError },
            attempts >= OUTBOX_MAX_ATTEMPTS ? 'Outbox event gave up' : 'Outbox event failed',
          );
        }
      }
      return done;
    } finally {
      this.running = false;
    }
  }
}

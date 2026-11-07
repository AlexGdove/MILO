import {
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { PrismaService } from '../../prisma/prisma.service.js';

export const TELEGRAM_UPDATES_TTL_MS = 7 * 24 * 60 * 60_000;
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60_000;
export const OUTBOX_PROCESSED_TTL_MS = 30 * 24 * 60 * 60_000;
const INTERVAL_MS = 60 * 60_000;

export interface CleanupResult {
  telegramUpdates: number;
  idempotencyKeys: number;
  outboxEvents: number;
}

/**
 * Периодическая очистка служебных таблиц: дедупликация Telegram (7 дней), ключи
 * идемпотентности (24 ч), отправленные события outbox (30 дней). Неотправленные события не
 * удаляются. В тестах таймер не запускается — `run` вызывают явно.
 */
@Injectable()
export class CleanupService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(CleanupService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onApplicationBootstrap(): void {
    if (this.config.get('NODE_ENV') === 'test') return;
    this.timer = setInterval(() => {
      this.run().catch((error: unknown) =>
        this.logger.error(
          { err: error instanceof Error ? error.message : String(error) },
          'Cleanup failed',
        ),
      );
    }, INTERVAL_MS);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  async run(now = new Date()): Promise<CleanupResult> {
    const before = (ttl: number) => new Date(now.getTime() - ttl);
    const [updates, keys, events] = await Promise.all([
      this.prisma.telegramUpdate.deleteMany({
        where: { receivedAt: { lt: before(TELEGRAM_UPDATES_TTL_MS) } },
      }),
      this.prisma.idempotencyKey.deleteMany({
        where: { createdAt: { lt: before(IDEMPOTENCY_TTL_MS) } },
      }),
      this.prisma.outboxEvent.deleteMany({
        where: { processedAt: { lt: before(OUTBOX_PROCESSED_TTL_MS) } },
      }),
    ]);
    const result: CleanupResult = {
      telegramUpdates: updates.count,
      idempotencyKeys: keys.count,
      outboxEvents: events.count,
    };
    if (result.telegramUpdates + result.idempotencyKeys + result.outboxEvents > 0) {
      this.logger.log(result, 'Cleanup done');
    }
    return result;
  }
}

import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

/** Сколько ждать ответа Redis, прежде чем считать его недоступным (мс). */
const COMMAND_TIMEOUT_MS = 1000;

/**
 * Клиент Redis (ioredis). Подключается в фоне и переподключается сам; процесс стартует
 * и без Redis (живость `/health`), готовность показывает `/health/ready`. Команды при
 * недоступном Redis отклоняются через `COMMAND_TIMEOUT_MS`, а не висят.
 */
@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);

  constructor(config: ConfigService) {
    super(config.getOrThrow<string>('REDIS_URL'), {
      commandTimeout: COMMAND_TIMEOUT_MS,
      maxRetriesPerRequest: 1,
    });
    // Без обработчика ioredis печатает каждую ошибку подключения как «Unhandled error event»
    this.on('error', (err: Error) => {
      this.logger.warn({ err: { message: err.message } }, 'Redis connection error');
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.status === 'end') return;
    try {
      await this.quit();
    } catch {
      this.disconnect();
    }
  }

  /** Redis отвечает на команды. */
  async isReady(): Promise<boolean> {
    try {
      return (await this.ping()) === 'PONG';
    } catch {
      return false;
    }
  }
}

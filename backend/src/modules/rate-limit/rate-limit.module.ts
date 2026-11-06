import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { RateLimitGuard } from './rate-limit.guard.js';
import { RedisRateLimitStorage } from './rate-limit.storage.js';

/** Лимиты запросов (`architecture.md` §5): глобальный guard и счётчики в Redis. */
@Module({
  providers: [RedisRateLimitStorage, { provide: APP_GUARD, useClass: RateLimitGuard }],
  exports: [RedisRateLimitStorage],
})
export class RateLimitModule {}

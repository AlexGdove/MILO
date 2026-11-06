import { Global, Module } from '@nestjs/common';

import { RedisService } from './redis.service.js';

/** Один клиент Redis на всё приложение. */
@Global()
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class RedisModule {}

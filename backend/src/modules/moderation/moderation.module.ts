import { Module } from '@nestjs/common';

import { ModerationService } from './moderation.service.js';

/** Решения оператора по предложениям продуктов (B-18); вызывает бот модерации (этап 9). */
@Module({
  providers: [ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}

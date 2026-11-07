import { Module } from '@nestjs/common';

import { OutboxWorker } from './outbox.worker.js';

/** Отправка событий outbox получателям (боты Telegram, этап 9). */
@Module({
  providers: [OutboxWorker],
  exports: [OutboxWorker],
})
export class OutboxModule {}

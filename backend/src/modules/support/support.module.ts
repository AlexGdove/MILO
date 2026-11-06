import { Module } from '@nestjs/common';

import { SupportController, TicketIdPipe } from './support.controller.js';
import { SupportEvents } from './support.events.js';
import { SupportGateway } from './support.gateway.js';
import { SupportService } from './support.service.js';
import { IdempotencyInterceptor } from '../../common/idempotency/idempotency.interceptor.js';
import { DeviceKeysModule } from '../device-keys/device-keys.module.js';
import { RateLimitModule } from '../rate-limit/rate-limit.module.js';

/** Анонимная поддержка (B-10, B-18): REST и WebSocket `/support`. */
@Module({
  imports: [DeviceKeysModule, RateLimitModule],
  controllers: [SupportController],
  providers: [SupportService, SupportEvents, SupportGateway, IdempotencyInterceptor, TicketIdPipe],
  exports: [SupportService],
})
export class SupportModule {}

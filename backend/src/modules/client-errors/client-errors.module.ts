import { Module } from '@nestjs/common';

import { ClientErrorsController } from './client-errors.controller.js';
import { ClientErrorsService } from './client-errors.service.js';
import { DeviceKeysModule } from '../device-keys/device-keys.module.js';
import { RateLimitModule } from '../rate-limit/rate-limit.module.js';

/** Сбор ошибок приложения (решение №62). */
@Module({
  imports: [DeviceKeysModule, RateLimitModule],
  controllers: [ClientErrorsController],
  providers: [ClientErrorsService],
  exports: [ClientErrorsService],
})
export class ClientErrorsModule {}

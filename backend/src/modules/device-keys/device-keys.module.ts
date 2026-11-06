import { Module } from '@nestjs/common';

import { DeviceKeyGuard } from './device-key.guard.js';
import { DeviceKeysController } from './device-keys.controller.js';
import { DeviceKeysService } from './device-keys.service.js';

/** Анонимный ключ устройства (ADR-0001): выдача, проверка (`DeviceKeyGuard`), удаление. */
@Module({
  controllers: [DeviceKeysController],
  providers: [DeviceKeysService, DeviceKeyGuard],
  exports: [DeviceKeysService, DeviceKeyGuard],
})
export class DeviceKeysModule {}

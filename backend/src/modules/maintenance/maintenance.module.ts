import { Module } from '@nestjs/common';

import { CleanupService } from './cleanup.service.js';

/** Фоновые служебные задачи сервера (очистка таблиц). */
@Module({
  providers: [CleanupService],
})
export class MaintenanceModule {}

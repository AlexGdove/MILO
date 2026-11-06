import { Module } from '@nestjs/common';

import { DevToolsController } from './dev-tools.controller.js';
import { SupportModule } from '../support/support.module.js';

/** Служебные маршруты разработки (`DEV_TOOLS=true`, не production — `DevToolsGuard`). */
@Module({
  imports: [SupportModule],
  controllers: [DevToolsController],
})
export class DevToolsModule {}

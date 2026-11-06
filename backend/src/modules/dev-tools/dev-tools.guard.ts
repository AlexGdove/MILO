import { type CanActivate, HttpStatus, Injectable } from '@nestjs/common';

import { AppException } from '../../common/errors/app.exception.js';
import { devToolsEnabled } from '../../config/env.validation.js';

/**
 * Служебные маршруты разработки доступны только при `DEV_TOOLS=true` вне production;
 * иначе — `404 not_found`, как будто маршрута нет. Проверка на каждом запросе: модуль
 * подключён всегда, потому что `.env` (ConfigModule) загружается уже после сборки модулей.
 */
@Injectable()
export class DevToolsGuard implements CanActivate {
  canActivate(): boolean {
    if (!devToolsEnabled()) {
      throw new AppException(HttpStatus.NOT_FOUND, 'not_found', 'Cannot find this route');
    }
    return true;
  }
}

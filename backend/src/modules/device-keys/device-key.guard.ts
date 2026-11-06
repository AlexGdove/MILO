import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { DEVICE_KEY_HEADER, isDeviceKeyFormat } from './device-key.js';
import { type DeviceKeyIdentity, DeviceKeysService } from './device-keys.service.js';
import { AppException } from '../../common/errors/app.exception.js';

const ALLOW_BLOCKED = 'milo:device-key-allow-blocked';
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

interface RequestWithDeviceKey {
  method: string;
  headers: Record<string, string | string[] | undefined>;
  deviceKey?: DeviceKeyIdentity;
}

/**
 * Маршрут доступен и заблокированному ключу. Только для удаления своих данных
 * (`DELETE /device-keys/me`): право стереть данные не зависит от блокировки.
 */
export const AllowBlockedDeviceKey = () => SetMetadata(ALLOW_BLOCKED, true);

/**
 * Требует `X-Device-Key` (`docs/backend/api.md`): нет заголовка — `401 device_key_required`;
 * неверный формат или неизвестный ключ — `401 device_key_invalid`; заблокированный ключ на
 * запись — `403 device_key_blocked`. Устройство кладётся в `request.deviceKey`.
 */
@Injectable()
export class DeviceKeyGuard implements CanActivate {
  constructor(
    private readonly deviceKeys: DeviceKeysService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithDeviceKey>();
    const header = request.headers[DEVICE_KEY_HEADER];

    if (header === undefined || header === '') {
      throw new AppException(
        HttpStatus.UNAUTHORIZED,
        'device_key_required',
        'X-Device-Key header is required',
      );
    }
    const identity = isDeviceKeyFormat(header) ? await this.deviceKeys.resolve(header) : null;
    if (!identity) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'device_key_invalid', 'Unknown device key');
    }

    const allowBlocked = this.reflector.getAllAndOverride<boolean>(ALLOW_BLOCKED, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (identity.blocked && !allowBlocked && !READ_METHODS.has(request.method)) {
      throw new AppException(HttpStatus.FORBIDDEN, 'device_key_blocked', 'Device key is blocked');
    }

    request.deviceKey = identity;
    return true;
  }
}

/** Устройство, проверенное `DeviceKeyGuard`. */
export const CurrentDeviceKey = createParamDecorator(
  (_data: unknown, context: ExecutionContext): DeviceKeyIdentity => {
    const identity = context.switchToHttp().getRequest<RequestWithDeviceKey>().deviceKey;
    if (!identity) {
      // Ошибка программиста: декоратор без guard на маршруте
      throw new Error('CurrentDeviceKey used without DeviceKeyGuard');
    }
    return identity;
  },
);

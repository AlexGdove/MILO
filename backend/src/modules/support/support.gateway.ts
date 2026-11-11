import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type OnGatewayConnection, type OnGatewayInit, WebSocketGateway } from '@nestjs/websockets';
import type { Namespace, Socket } from 'socket.io';

import { deviceRoom, SupportEvents } from './support.events.js';
import { getAppConfig } from '../../config/app-config.js';
import { isDeviceKeyFormat } from '../device-keys/device-key.js';
import { DeviceKeysService } from '../device-keys/device-keys.service.js';
import { clientIp } from '../rate-limit/client-ip.js';
import { normalizeIp } from '../rate-limit/normalize-ip.js';
import { RATE_LIMIT_POLICIES } from '../rate-limit/rate-limit.policies.js';
import { RedisRateLimitStorage } from '../rate-limit/rate-limit.storage.js';

export const SUPPORT_NAMESPACE = '/support';

/** Ошибки рукопожатия: клиент получает `connect_error` с этим `message`. */
export const WS_ERRORS = {
  required: 'device_key_required',
  invalid: 'device_key_invalid',
  limited: 'rate_limited',
  unavailable: 'service_unavailable',
} as const;

/**
 * WebSocket поддержки (`api.md`): только доставка событий своих обращений. Отправка сообщений —
 * только REST (идемпотентность, лимиты). Ключ — `auth: { deviceKey }` при подключении;
 * подключения ограничены по IP (`supportConnect`). CORS — в `MiloIoAdapter`.
 */
@WebSocketGateway({ namespace: SUPPORT_NAMESPACE })
export class SupportGateway implements OnGatewayInit<Namespace>, OnGatewayConnection<Socket> {
  private readonly logger = new Logger(SupportGateway.name);
  /** Сколько прокси перед сервером (`TRUST_PROXY`) — как у HTTP-лимитов */
  private readonly trustProxy: number;

  constructor(
    private readonly deviceKeys: DeviceKeysService,
    private readonly events: SupportEvents,
    private readonly rateLimits: RedisRateLimitStorage,
    config: ConfigService,
  ) {
    this.trustProxy = getAppConfig(config).trustProxy;
  }

  afterInit(namespace: Namespace): void {
    this.events.attach(namespace);
    namespace.use((socket, next) => {
      this.authenticate(socket).then(
        (error) => next(error ? new Error(error) : undefined),
        (error: unknown) => {
          this.logger.error(
            { err: error instanceof Error ? { message: error.message } : error },
            'WebSocket handshake failed',
          );
          next(new Error(WS_ERRORS.unavailable));
        },
      );
    });
  }

  handleConnection(socket: Socket): void {
    const deviceKeyId = socket.data.deviceKeyId as string | undefined;
    if (deviceKeyId) void socket.join(deviceRoom(deviceKeyId));
  }

  /** `null` — можно подключаться (id устройства в `socket.data`), иначе код ошибки. */
  private async authenticate(socket: Socket): Promise<string | null> {
    const policy = RATE_LIMIT_POLICIES.supportConnect;
    // За Caddy адрес соединения — адрес прокси (общий для всех), IP клиента — из X-Forwarded-For
    const ip = normalizeIp(
      clientIp(
        socket.handshake.address,
        socket.handshake.headers['x-forwarded-for'],
        this.trustProxy,
      ),
    );
    const hit = await this.rateLimits.hit(`supportConnect:${ip}`, policy.ttl, policy.limit);
    if (hit.blocked) return WS_ERRORS.limited;

    const key: unknown = (socket.handshake.auth as { deviceKey?: unknown }).deviceKey;
    if (key === undefined || key === '') return WS_ERRORS.required;
    const identity = isDeviceKeyFormat(key) ? await this.deviceKeys.resolve(key) : null;
    if (!identity) return WS_ERRORS.invalid;
    socket.data.deviceKeyId = identity.id;
    return null;
  }
}

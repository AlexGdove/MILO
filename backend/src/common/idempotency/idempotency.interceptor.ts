import { createHash } from 'node:crypto';

import {
  type CallHandler,
  type ExecutionContext,
  HttpStatus,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { from, mergeMap, type Observable, of } from 'rxjs';

import { stableStringify } from './stable-stringify.js';
import { Prisma } from '../../generated/prisma/client.js';
import type { DeviceKeyIdentity } from '../../modules/device-keys/device-keys.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AppException } from '../errors/app.exception.js';

export const IDEMPOTENCY_HEADER = 'idempotency-key';
/** Сохранённый ответ действителен сутки (`database.md`); старше — запрос выполняется заново. */
export const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface IdempotentRequest {
  method: string;
  path: string;
  body: unknown;
  headers: Record<string, string | string[] | undefined>;
  deviceKey?: DeviceKeyIdentity;
}

/** Хэш запроса: тот же ключ на другой маршрут или с другим телом — несовпадение. */
export function requestHash(req: Pick<IdempotentRequest, 'method' | 'path' | 'body'>): string {
  return createHash('sha256')
    .update(stableStringify({ method: req.method, path: req.path, body: req.body ?? null }))
    .digest('hex');
}

/**
 * `Idempotency-Key` для POST с созданием (`api.md`): повтор с тем же телом → тот же ответ
 * без повторного создания; с другим телом → `422 idempotency_mismatch`. Без заголовка —
 * обычный запрос. Работает после `DeviceKeyGuard`: ключи идемпотентности — у устройства.
 * Сохраняются только успешные ответы (ошибку клиент может повторить с тем же ключом).
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const req = context.switchToHttp().getRequest<IdempotentRequest>();
    const header = req.headers[IDEMPOTENCY_HEADER];
    if (header === undefined) return next.handle();
    if (typeof header !== 'string' || !UUID.test(header)) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'validation_failed',
        'Invalid Idempotency-Key',
        [{ field: 'Idempotency-Key', message: 'Idempotency-Key must be a UUID' }],
      );
    }
    const deviceKeyId = req.deviceKey?.id;
    if (!deviceKeyId) throw new Error('IdempotencyInterceptor used without DeviceKeyGuard');

    const key = header.toLowerCase();
    const hash = requestHash(req);
    const where = { deviceKeyId_key: { deviceKeyId, key } };
    const saved = await this.prisma.idempotencyKey.findUnique({ where });

    if (saved && Date.now() - saved.createdAt.getTime() < IDEMPOTENCY_TTL_MS) {
      if (saved.requestHash !== hash) {
        throw new AppException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'idempotency_mismatch',
          'Idempotency-Key was used with a different request',
        );
      }
      return of(saved.response);
    }
    if (saved) await this.prisma.idempotencyKey.deleteMany({ where: { deviceKeyId, key } });

    return next
      .handle()
      .pipe(mergeMap((body) => from(this.save(deviceKeyId, key, hash, context, body))));
  }

  private async save(
    deviceKeyId: string,
    key: string,
    hash: string,
    context: ExecutionContext,
    body: unknown,
  ): Promise<unknown> {
    try {
      await this.prisma.idempotencyKey.create({
        data: {
          deviceKeyId,
          key,
          requestHash: hash,
          statusCode: statusOf(context),
          response: (body ?? null) as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      // Параллельный запрос с тем же ключом успел сохранить ответ — наш ответ тоже верный
      const duplicate =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
      if (!duplicate) throw error;
    }
    return body;
  }
}

/** Код успешного ответа маршрута: `@HttpCode` или по умолчанию 201 для POST. */
function statusOf(context: ExecutionContext): number {
  const code: unknown = Reflect.getMetadata('__httpCode__', context.getHandler());
  return typeof code === 'number' ? code : HttpStatus.CREATED;
}

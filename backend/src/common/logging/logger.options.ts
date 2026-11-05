import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { Params } from 'nestjs-pino';

import type { AppConfig } from '../../config/app-config.js';

export const REQUEST_ID_HEADER = 'x-request-id';
const REQUEST_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

type RequestWithId = IncomingMessage & { id?: unknown };

/** id запроса: берём из заголовка клиента, если он безопасный, иначе создаём; отдаём в ответе. */
export function resolveRequestId(req: RequestWithId, res: ServerResponse): string {
  if (typeof req.id === 'string') return req.id;
  const incoming = req.headers[REQUEST_ID_HEADER];
  const id =
    typeof incoming === 'string' && REQUEST_ID_PATTERN.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', id);
  req.id = id;
  return id;
}

/**
 * Первый middleware приложения: id есть даже у запросов, отклонённых body-parser
 * до логгера (некорректный JSON, слишком большое тело).
 */
export function requestIdMiddleware(req: RequestWithId, res: ServerResponse, next: () => void) {
  resolveRequestId(req, res);
  next();
}

/**
 * Структурированные логи (pino). Ключ устройства, cookie и тела запросов не пишутся
 * (`docs/backend/architecture.md` §6).
 */
export function buildLoggerOptions(config: AppConfig): Params {
  return {
    pinoHttp: {
      level: config.logLevel,
      genReqId: resolveRequestId,
      autoLogging: { ignore: (req) => req.url?.startsWith('/api/v1/health') ?? false },
      redact: {
        paths: ['req.headers["x-device-key"]', 'req.headers.authorization', 'req.headers.cookie'],
        censor: '[redacted]',
      },
      serializers: {
        req: (req: { id: unknown; method: string; url: string; remoteAddress?: string }) => ({
          id: req.id,
          method: req.method,
          url: req.url,
          remoteAddress: req.remoteAddress,
        }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    },
  };
}

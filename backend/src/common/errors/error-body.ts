import { HttpException, HttpStatus } from '@nestjs/common';

import { AppException, type ErrorDetail } from './app.exception.js';

export interface ErrorBody {
  code: string;
  message: string;
  details?: ErrorDetail[];
  requestId: string;
}

const DEFAULT_CODES: Partial<Record<number, string>> = {
  400: 'bad_request',
  401: 'unauthorized',
  403: 'forbidden',
  404: 'not_found',
  405: 'method_not_allowed',
  409: 'conflict',
  413: 'payload_too_large',
  415: 'unsupported_media_type',
  422: 'unprocessable_entity',
  429: 'rate_limited',
  500: 'internal_error',
  503: 'service_unavailable',
};

function codeFor(status: number): string {
  return DEFAULT_CODES[status] ?? (status >= 500 ? 'internal_error' : 'http_error');
}

/** Приводит любую ошибку к единому формату ответа и статусу HTTP. */
export function toErrorBody(
  exception: unknown,
  requestId: string,
): { status: number; body: ErrorBody } {
  if (exception instanceof AppException) {
    const body: ErrorBody = { code: exception.code, message: exception.message, requestId };
    if (exception.details && exception.details.length > 0) body.details = exception.details;
    return { status: exception.getStatus(), body };
  }

  // Ошибки Express и body-parser (некорректный JSON, слишком большое тело) Nest уже
  // превращает в HttpException с нужным статусом — они попадают сюда
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return { status, body: { code: codeFor(status), message: exception.message, requestId } };
  }

  // Неизвестная ошибка: детали не раскрываются клиенту, только в лог
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    body: { code: 'internal_error', message: 'Internal server error', requestId },
  };
}

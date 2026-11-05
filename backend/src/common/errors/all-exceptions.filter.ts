import { type ArgumentsHost, Catch, type ExceptionFilter, Logger } from '@nestjs/common';
import type { Request, Response } from 'express';

import { toErrorBody } from './error-body.js';
import { fromPrismaError } from '../../prisma/prisma-errors.js';

/** Глобальный фильтр: любой ответ с ошибкой — `{ error: { code, message, details?, requestId } }`. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request & { id?: unknown }>();
    const response = http.getResponse<Response>();
    const requestId = typeof request.id === 'string' ? request.id : 'unknown';

    const { status, body } = toErrorBody(fromPrismaError(exception) ?? exception, requestId);
    if (status >= 500) {
      this.logger.error({ err: exception, requestId }, 'Unhandled error');
    }
    response.status(status).json({ error: body });
  }
}

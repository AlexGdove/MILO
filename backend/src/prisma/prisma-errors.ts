import { HttpStatus } from '@nestjs/common';

import { AppException } from '../common/errors/app.exception.js';
import { Prisma } from '../generated/prisma/client.js';

/**
 * Ошибки базы, которые означают ошибку запроса, а не сбой сервера, — в ответ API.
 * Остальные (в т. ч. нарушение CHECK: DTO должны отсечь такие данные раньше) остаются 500.
 * Коды: https://www.prisma.io/docs/orm/reference/error-reference
 */
export function fromPrismaError(error: unknown): AppException | null {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return new AppException(HttpStatus.CONFLICT, 'conflict', 'Unique constraint violated');
      case 'P2003':
        return new AppException(HttpStatus.CONFLICT, 'conflict', 'Related record constraint');
      case 'P2025':
        return new AppException(HttpStatus.NOT_FOUND, 'not_found', 'Record not found');
      case 'P2034':
        return new AppException(HttpStatus.CONFLICT, 'conflict', 'Transaction conflict, retry');
      case 'P1001':
      case 'P1002':
        return unavailable();
      default:
        return null;
    }
  }
  if (error instanceof Prisma.PrismaClientInitializationError) return unavailable();
  return null;
}

function unavailable(): AppException {
  return new AppException(
    HttpStatus.SERVICE_UNAVAILABLE,
    'service_unavailable',
    'Database is unavailable',
  );
}

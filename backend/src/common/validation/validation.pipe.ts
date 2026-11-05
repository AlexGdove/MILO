import { HttpStatus, ValidationPipe, type ValidationError } from '@nestjs/common';

import { AppException, type ErrorDetail } from '../errors/app.exception.js';

/** Разворачивает дерево ошибок class-validator в плоский список «поле — сообщение». */
export function flattenValidationErrors(errors: ValidationError[], parent = ''): ErrorDetail[] {
  return errors.flatMap((error) => {
    const field = parent ? `${parent}.${error.property}` : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({ field, message }));
    return [...own, ...flattenValidationErrors(error.children ?? [], field)];
  });
}

/** Глобальная валидация DTO: лишние поля — ошибка, типы приводятся по DTO. */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new AppException(
        HttpStatus.BAD_REQUEST,
        'validation_failed',
        'Request validation failed',
        flattenValidationErrors(errors),
      ),
  });
}

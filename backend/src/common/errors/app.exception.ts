import { HttpException, type HttpStatus } from '@nestjs/common';

export interface ErrorDetail {
  /** Путь к полю тела запроса, например `ingredients.0.amount` */
  field?: string;
  message: string;
}

/**
 * Ошибка с машинным кодом из контракта API (`docs/backend/api.md`).
 * Тексты для людей формирует клиент по `code`.
 */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: string,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message, status);
  }
}

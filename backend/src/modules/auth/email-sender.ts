import { Injectable, Logger } from '@nestjs/common';

/**
 * Отправка писем со входом. Почтовый сервис ещё не выбран (решение №68) — код работает через
 * этот интерфейс; реализация подключается в `AuthModule` по `EMAIL_TRANSPORT`.
 */
export abstract class EmailSender {
  abstract sendLoginCode(email: string, code: string): Promise<void>;
}

/** Разработка: код входа — в лог сервера. В production запрещено (`validateEnv`). */
@Injectable()
export class LogEmailSender extends EmailSender {
  private readonly logger = new Logger('EmailSender');

  sendLoginCode(email: string, code: string): Promise<void> {
    this.logger.warn(`Код входа для ${email}: ${code} (EMAIL_TRANSPORT=log, только разработка)`);
    return Promise.resolve();
  }
}

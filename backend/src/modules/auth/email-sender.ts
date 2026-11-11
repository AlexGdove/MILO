import { Injectable, Logger } from '@nestjs/common';

import type { CodePurpose } from '../../generated/prisma/client.js';

/**
 * Отправка писем с кодом (подтверждение почты, сброс пароля — решение №69). Почтовый сервис
 * ещё не выбран — код работает через этот интерфейс; реализация подключается в `AuthModule`.
 */
export abstract class EmailSender {
  abstract sendCode(email: string, code: string, purpose: CodePurpose): Promise<void>;
}

const PURPOSE_LABEL: Record<CodePurpose, string> = {
  verify_email: 'подтверждения почты',
  reset_password: 'сброса пароля',
};

/** Разработка: код — в лог сервера. В production запрещено (`validateEnv`). */
@Injectable()
export class LogEmailSender extends EmailSender {
  private readonly logger = new Logger('EmailSender');

  sendCode(email: string, code: string, purpose: CodePurpose): Promise<void> {
    this.logger.warn(
      `Код ${PURPOSE_LABEL[purpose]} для ${email}: ${code} (EMAIL_TRANSPORT=log, только разработка)`,
    );
    return Promise.resolve();
  }
}

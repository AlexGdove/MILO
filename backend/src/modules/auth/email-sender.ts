import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

import type { SmtpConfig } from './auth.config.js';
import { buildCodeEmail } from './email-content.js';
import type { CodePurpose } from '../../generated/prisma/client.js';

/**
 * Отправка писем с кодом (подтверждение почты, сброс пароля — решение №69). Реализацию выбирает
 * `AuthModule` по `EMAIL_TRANSPORT`: `log` (разработка) или `smtp` (свой почтовый сервер, №70).
 */
export abstract class EmailSender {
  abstract sendCode(email: string, code: string, purpose: CodePurpose): Promise<void>;
}

/** Адрес не принимает почту (домен без почты, ящика нет) — повтор не поможет, нужен другой адрес */
export class EmailRejectedError extends Error {
  constructor() {
    super('Recipient address rejected');
    this.name = 'EmailRejectedError';
  }
}

/** Адреса в тексте ошибки SMTP (ответ сервера получателя) — не в лог */
export const maskEmails = (text: string): string =>
  text.replace(/[^\s<>@:;,=]+@[^\s<>@:;,=]+/g, '[email]');

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

/**
 * Письмо через SMTP: в production — свой почтовый сервер `mail` во внутренней сети compose
 * (решение №70), он подписывает письмо DKIM и доставляет получателю. Ошибка отправки — исключение
 * (клиент получит 503 и попросит повторить), в лог — без адреса и кода.
 */
export class SmtpEmailSender extends EmailSender {
  private readonly logger = new Logger('EmailSender');

  constructor(
    private readonly config: SmtpConfig,
    private readonly transport: Transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: false,
      // Внутренняя сеть compose: STARTTLS не обязателен, но если сервер предложит — используется
      requireTLS: false,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    }),
  ) {
    super();
  }

  async sendCode(email: string, code: string, purpose: CodePurpose): Promise<void> {
    const content = buildCodeEmail(code, purpose);
    try {
      await this.transport.sendMail({ from: this.config.from, to: email, ...content });
    } catch (error) {
      this.logger.error(
        {
          err: { message: maskEmails(error instanceof Error ? error.message : String(error)) },
          purpose,
        },
        'Email sending failed',
      );
      // Постоянный отказ получателя (5xx на RCPT TO) — адрес не принимает почту
      const smtp = error as { code?: unknown; responseCode?: unknown };
      if (
        smtp.code === 'EENVELOPE' &&
        typeof smtp.responseCode === 'number' &&
        smtp.responseCode >= 500
      ) {
        throw new EmailRejectedError();
      }
      throw error;
    }
  }
}

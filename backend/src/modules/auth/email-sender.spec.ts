import { createTransport, type SendMailOptions, type Transporter } from 'nodemailer';

import { EmailRejectedError, maskEmails, SmtpEmailSender } from './email-sender.js';

const SMTP = { host: 'mail', port: 587, from: 'MILO <noreply@milo-app.ru>' };

/** Транспорт для теста: письма собирает nodemailer (jsonTransport), вызовы записываются */
const recording = (fail?: Error) => {
  const json = createTransport({ jsonTransport: true });
  const calls: SendMailOptions[] = [];
  const results: Array<{ message: string }> = [];
  const transport = {
    sendMail: async (options: SendMailOptions) => {
      calls.push(options);
      if (fail) throw fail;
      const info = (await json.sendMail(options)) as { message: string };
      results.push(info);
      return info;
    },
  } as unknown as Transporter;
  return { transport, calls, results };
};

describe('Отправка писем через SMTP', () => {
  it('собирает письмо: отправитель, получатель, тема и обе версии текста', async () => {
    const { transport, calls, results } = recording();
    const sender = new SmtpEmailSender(SMTP, transport);

    await sender.sendCode('anna@example.com', '123456', 'verify_email');

    expect(calls).toEqual([
      expect.objectContaining({
        from: 'MILO <noreply@milo-app.ru>',
        to: 'anna@example.com',
        subject: 'Код подтверждения MILO: 123456',
        text: expect.stringContaining('123456'),
        html: expect.stringContaining('123456'),
      }),
    ]);
    const message = JSON.parse(results[0]!.message) as {
      subject: string;
      to: Array<{ address: string }>;
    };
    expect(message.subject).toBe('Код подтверждения MILO: 123456');
    expect(message.to[0]!.address).toBe('anna@example.com');
  });

  it('ошибка отправки пробрасывается (сервис ответит 503)', async () => {
    const { transport } = recording(new Error('550 <anna@example.com> rejected'));
    const sender = new SmtpEmailSender(SMTP, transport);

    await expect(sender.sendCode('anna@example.com', '123456', 'reset_password')).rejects.toThrow(
      '550',
    );
  });

  it('постоянный отказ получателя (5xx на RCPT TO) → EmailRejectedError', async () => {
    const rejected = Object.assign(new Error('all recipients were rejected'), {
      code: 'EENVELOPE',
      responseCode: 556,
    });
    const { transport } = recording(rejected);
    await expect(
      new SmtpEmailSender(SMTP, transport).sendCode('a@no-mail.example', '123456', 'verify_email'),
    ).rejects.toBeInstanceOf(EmailRejectedError);
  });

  it('временный отказ (4xx) — обычная ошибка, не «адрес не принимает почту»', async () => {
    const temporary = Object.assign(new Error('try later'), {
      code: 'EENVELOPE',
      responseCode: 451,
    });
    const { transport } = recording(temporary);
    const failure = await new SmtpEmailSender(SMTP, transport)
      .sendCode('anna@example.com', '123456', 'verify_email')
      .catch((error: unknown) => error);
    expect(failure).not.toBeInstanceOf(EmailRejectedError);
  });

  it('адреса в тексте ошибки маскируются', () => {
    expect(maskEmails('550 5.1.1 <anna@example.com>: Recipient address rejected')).toBe(
      '550 5.1.1 <[email]>: Recipient address rejected',
    );
    expect(maskEmails('to=boris@mail.ru, status=bounced')).toBe('to=[email], status=bounced');
    expect(maskEmails('connection timed out')).toBe('connection timed out');
  });
});

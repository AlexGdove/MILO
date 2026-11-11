import type { CodePurpose } from '../../generated/prisma/client.js';

export interface CodeEmail {
  subject: string;
  text: string;
  html: string;
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const VALID = 'Код действует 10 минут.';
const IGNORE =
  'Если вы не запрашивали код, просто проигнорируйте это письмо — без кода никто не войдёт в ваш аккаунт.';
const SIGNATURE = '— MILO, milo-app.ru';

/** Письмо с кодом (решение №69): тема, текст и простой HTML без внешних картинок и ссылок. */
export function buildCodeEmail(code: string, purpose: CodePurpose): CodeEmail {
  const verify = purpose === 'verify_email';
  const subject = verify
    ? `Код подтверждения MILO: ${code}`
    : `Код для нового пароля MILO: ${code}`;
  const firstLine = verify
    ? `Ваш код подтверждения почты в MILO: ${code}`
    : `Ваш код для смены пароля в MILO: ${code}`;

  const text = [firstLine, '', VALID, '', IGNORE, '', SIGNATURE].join('\n');
  const html = [
    '<!doctype html>',
    '<html lang="ru">',
    '<body style="font-family:Arial,sans-serif;color:#1f2937">',
    `<p>${escapeHtml(firstLine)}</p>`,
    `<p style="font-size:28px;font-weight:bold;letter-spacing:4px">${escapeHtml(code)}</p>`,
    `<p>${VALID}</p>`,
    `<p>${IGNORE}</p>`,
    `<p>${SIGNATURE}</p>`,
    '</body>',
    '</html>',
  ].join('\n');

  return { subject, text, html };
}

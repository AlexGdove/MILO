import { EMAIL_LOGO_PNG_BASE64 } from './email-logo.js';
import type { CodePurpose } from '../../generated/prisma/client.js';

/** Картинка внутри письма: в HTML на неё ссылаются как `cid:<cid>` (формат вложений nodemailer) */
export interface InlineImage {
  filename: string;
  content: Buffer;
  contentType: string;
  cid: string;
}

export interface CodeEmail {
  subject: string;
  text: string;
  html: string;
  attachments: InlineImage[];
}

/** Знак MILO вложением в письмо — без внешних ссылок (они повышают риск попасть в «Спам») */
export const EMAIL_LOGO_CID = 'logo@milo-app.ru';
const LOGO: InlineImage = {
  filename: 'milo.png',
  content: Buffer.from(EMAIL_LOGO_PNG_BASE64, 'base64'),
  contentType: 'image/png',
  cid: EMAIL_LOGO_CID,
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const VALID = 'Код действует 10 минут.';
const IGNORE =
  'Если вы не запрашивали код, просто проигнорируйте это письмо — без кода никто не войдёт в ваш аккаунт.';
const SIGNATURE = '— MILO, milo-app.ru';

/** Палитра «Орбита» (светлая тема, `docs/brand.md`): почтовые клиенты не знают CSS-переменных */
const COLOR = {
  primary: '#2F3BD9',
  primarySoft: '#EEF0FF',
  text: '#12131C',
  muted: '#5E6280',
  bg: '#F4F5FA',
  surface: '#FFFFFF',
  border: '#E1E3EF',
} as const;
/** Шрифты бренда, если стоят у получателя; иначе — системные */
const FONT = "Onest, 'Segoe UI', Roboto, Arial, sans-serif";
const DISPLAY_FONT = "Unbounded, 'Arial Black', Arial, sans-serif";
const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';

/**
 * Письмо с кодом (решение №69): тема, текст и HTML в стиле MILO (палитра «Орбита», знак MILO —
 * картинкой внутри письма) — без внешних картинок, ссылок и шрифтов. Вёрстка таблицами со стилями
 * в атрибутах — так её одинаково показывают Gmail, Mail.ru, Яндекс и Outlook.
 */
export function buildCodeEmail(code: string, purpose: CodePurpose): CodeEmail {
  const verify = purpose === 'verify_email';
  const subject = verify
    ? `Код подтверждения MILO: ${code}`
    : `Код для нового пароля MILO: ${code}`;
  const firstLine = verify
    ? `Ваш код подтверждения почты в MILO: ${code}`
    : `Ваш код для смены пароля в MILO: ${code}`;
  const title = verify ? 'Подтвердите почту' : 'Новый пароль';
  const lead = verify
    ? 'Введите этот код в MILO, чтобы подтвердить почту:'
    : 'Введите этот код в MILO, чтобы задать новый пароль:';
  // Строка-превью в списке писем (рядом с темой), в самом письме не видна
  const preheader = `Ваш код: ${code} · ${VALID}`;

  const text = [firstLine, '', VALID, '', IGNORE, '', SIGNATURE].join('\n');
  const html = [
    '<!doctype html>',
    '<html lang="ru">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<meta name="color-scheme" content="light">',
    '<meta name="supported-color-schemes" content="light">',
    `<title>${escapeHtml(subject)}</title>`,
    '</head>',
    `<body style="margin:0;padding:0;background:${COLOR.bg};">`,
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>`,
    `<table ${TABLE} width="100%" style="background:${COLOR.bg};">`,
    '<tr><td align="center" style="padding:32px 16px;">',
    `<table ${TABLE} width="100%" style="max-width:480px;">`,
    // Шапка: знак «м» с мятной точкой и слово MILO
    '<tr><td style="padding-bottom:20px;">',
    `<table ${TABLE}><tr>`,
    `<td style="width:44px;height:44px;vertical-align:middle;"><img src="cid:${EMAIL_LOGO_CID}" width="44" height="44" alt="MILO" style="display:block;width:44px;height:44px;border:0;border-radius:10px;"></td>`,
    `<td style="padding-left:12px;font-family:${DISPLAY_FONT};font-size:22px;font-weight:700;letter-spacing:1px;color:${COLOR.text};">MILO</td>`,
    '</tr></table>',
    '</td></tr>',
    // Карточка с кодом
    '<tr>',
    `<td style="background:${COLOR.surface};border:1px solid ${COLOR.border};border-radius:16px;padding:32px 28px;font-family:${FONT};color:${COLOR.text};">`,
    `<h1 style="margin:0 0 12px;font-family:${DISPLAY_FONT};font-size:22px;line-height:1.3;font-weight:700;color:${COLOR.text};">${title}</h1>`,
    `<p style="margin:0 0 20px;font-size:16px;line-height:1.5;">${escapeHtml(lead)}</p>`,
    `<div style="margin:0 0 20px;padding:18px 12px;background:${COLOR.primarySoft};border-radius:12px;text-align:center;font-family:${DISPLAY_FONT};font-size:32px;font-weight:700;letter-spacing:8px;color:${COLOR.primary};">${escapeHtml(code)}</div>`,
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.5;">${VALID}</p>`,
    `<p style="margin:0;font-size:13px;line-height:1.5;color:${COLOR.muted};">${IGNORE}</p>`,
    '</td>',
    '</tr>',
    // Подвал
    '<tr>',
    `<td style="padding:20px 8px 0;text-align:center;font-family:${FONT};font-size:12px;line-height:1.5;color:${COLOR.muted};">MILO — питание, кладовая и рецепты · milo-app.ru</td>`,
    '</tr>',
    '</table>',
    '</td></tr>',
    '</table>',
    '</body>',
    '</html>',
  ].join('\n');

  return { subject, text, html, attachments: [LOGO] };
}

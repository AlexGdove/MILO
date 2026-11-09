import { TELEGRAM_TEXT_LIMIT } from './bot-api.js';
import type { AutomodFlag } from '../products/automod.js';

/**
 * Тексты ботов для операторов (по-русски, без разметки). Чистые функции: данные приходят
 * уже прочитанными из базы, длина не превышает лимит Telegram.
 */

/** Обрезает текст до лимита Telegram, последний символ — «…». */
export function fitTelegram(text: string, limit = TELEGRAM_TEXT_LIMIT): string {
  const chars = Array.from(text);
  return chars.length <= limit ? text : `${chars.slice(0, limit - 1).join('')}…`;
}

export function newTicketText(number: number, text: string): string {
  return fitTelegram(
    `🆘 Обращение № ${number}\n\n${text}\n\n` +
      'Ответьте на это сообщение (reply) — ответ придёт пользователю в приложение.',
  );
}

export function userMessageText(number: number, text: string): string {
  return fitTelegram(`💬 Обращение № ${number} — пользователь:\n\n${text}`);
}

export function ticketClosedText(number: number): string {
  return `✔️ Обращение № ${number} закрыто пользователем.`;
}

/** Ответ на `/id`: номера чата и пользователя для настроек сервера. */
export function idText(chatId: number, userId?: number, threadId?: number): string {
  const lines = [`ID чата: ${chatId}`];
  if (threadId !== undefined) lines.push(`ID темы: ${threadId}`);
  if (userId !== undefined) lines.push(`Ваш Telegram ID: ${userId}`);
  return lines.join('\n');
}

export const START_TEXT =
  'Бот операторов MILO. Работает в группе операторов; /id — номер чата и ваш Telegram ID.';

export function notOperatorText(userId: number): string {
  return `Нет прав оператора. Ваш Telegram ID: ${userId} — его добавляет администратор сервера.`;
}

export const ONLY_TEXT = 'Пока можно отправить только текст.';
export const TOO_LONG = 'Слишком длинный ответ: не больше 4000 символов.';
export const TICKET_GONE = 'Обращение не найдено — возможно, пользователь удалил данные.';
export const REPLY_FAILED = 'Не удалось отправить ответ. Попробуйте ещё раз.';

const UNIT_LABEL = { g: 'г', ml: 'мл', pcs: 'шт' } as const;

const FLAG_LABEL: Record<AutomodFlag, string> = {
  banned_words: 'запрещённые слова',
  link_or_contact: 'ссылка или контакт',
  gibberish: 'бессмысленное название',
  suspicious_text: 'подозрительный текст',
  energy_mismatch: 'калории не сходятся с БЖУ',
  barcode_conflict: 'штрихкод уже есть с другими данными',
  name_conflict: 'похожий продукт уже есть',
  untrusted_author: 'у автора много отклонённых',
};

export interface SubmissionCardData {
  name: string;
  brand: string | null;
  barcode: string | null;
  unit: keyof typeof UNIT_LABEL;
  pieceWeight: number | null;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  flags: string[];
  deviceKeyId: string;
}

const num = (value: number) => String(Math.round(value * 100) / 100).replace('.', ',');

/** Карточка предложения продукта для бота модерации. */
export function submissionCardText(card: SubmissionCardData): string {
  const lines = [`🥫 Новый продукт на проверку`, '', card.name];
  if (card.brand) lines.push(`Бренд: ${card.brand}`);
  if (card.barcode) lines.push(`Штрихкод: ${card.barcode}`);
  lines.push(
    card.unit === 'pcs' && card.pieceWeight !== null
      ? `Единица: шт (1 шт = ${num(card.pieceWeight)} г)`
      : `Единица: ${UNIT_LABEL[card.unit]}`,
  );
  lines.push(
    `На 100 г: ${num(card.kcal)} ккал · Б ${num(card.protein)} · Ж ${num(card.fat)} · У ${num(card.carbs)}`,
  );
  if (card.flags.length > 0) {
    const labels = card.flags.map((flag) => FLAG_LABEL[flag as AutomodFlag] ?? flag);
    lines.push(`Замечания: ${labels.join('; ')}`);
  }
  lines.push(`Устройство: ${card.deviceKeyId.slice(0, 8)}`);
  return fitTelegram(lines.join('\n'));
}

export type ModerationOutcome = 'approved' | 'rejected' | 'blocked' | 'unblocked';

const OUTCOME_LABEL: Record<ModerationOutcome, string> = {
  approved: '✅ Принято',
  rejected: '❌ Отклонено',
  blocked: '🚫 Отклонено, устройство заблокировано',
  unblocked: '↩️ Устройство разблокировано',
};

/** Карточка после решения: итог и кто решил; кнопки при этом убираются. */
export function decidedCardText(card: string, outcome: ModerationOutcome, operator: string) {
  return fitTelegram(`${card}\n\n${OUTCOME_LABEL[outcome]} — ${operator}`);
}

export interface ClientErrorCardData {
  kind: string;
  message: string;
  stack: string | null;
  platform: string;
  appVersion: string;
  route: string | null;
  userAgent: string | null;
  count: number;
}

const KIND_LABEL: Record<string, string> = {
  error: 'ошибка кода',
  unhandledrejection: 'необработанный промис',
  render: 'ошибка отрисовки экрана',
};

/** Сообщение об ошибке приложения: новая или набравшая десяток, сотню, тысячу повторов. */
export function clientErrorText(card: ClientErrorCardData): string {
  const lines = [
    card.count === 1 ? '🐞 Новая ошибка в приложении' : `🐞 Ошибка повторяется: ${card.count} раз`,
    '',
    card.message,
    '',
    `Вид: ${KIND_LABEL[card.kind] ?? card.kind}`,
    `Версия: ${card.appVersion} · ${card.platform}${card.route ? ` · страница ${card.route}` : ''}`,
  ];
  if (card.userAgent) lines.push(`Браузер: ${card.userAgent}`);
  if (card.stack) lines.push('', 'Стек:', Array.from(card.stack).slice(0, 1200).join(''));
  return fitTelegram(lines.join('\n'));
}

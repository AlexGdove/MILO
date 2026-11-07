/** Разбор аргументов `npm run operator -w backend -- <команда> …` (чистая функция). */
export type OperatorCommand =
  | { command: 'add'; telegramUserId: bigint; displayName: string }
  | { command: 'remove'; telegramUserId: bigint }
  | { command: 'list' };

export const OPERATOR_USAGE = [
  'Использование:',
  '  npm run operator -w backend -- add <Telegram ID> <Имя>   — добавить или включить оператора',
  '  npm run operator -w backend -- remove <Telegram ID>       — выключить оператора',
  '  npm run operator -w backend -- list                       — список операторов',
  'Telegram ID присылает бот на команду /id.',
].join('\n');

const TELEGRAM_ID = /^[1-9]\d{0,15}$/;
const MAX_NAME = 64;

/** Неверные аргументы — `null` (вызывающий печатает `OPERATOR_USAGE`). */
export function parseOperatorArgs(args: string[]): OperatorCommand | null {
  const [command, id, ...rest] = args;
  if (command === 'list' && id === undefined) return { command: 'list' };
  if (!id || !TELEGRAM_ID.test(id)) return null;
  const telegramUserId = BigInt(id);
  if (command === 'remove' && rest.length === 0) return { command: 'remove', telegramUserId };
  if (command === 'add') {
    const displayName = rest.join(' ').trim();
    if (!displayName || Array.from(displayName).length > MAX_NAME) return null;
    return { command: 'add', telegramUserId, displayName };
  }
  return null;
}

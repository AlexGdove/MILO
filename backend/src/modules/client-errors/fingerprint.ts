import { createHash } from 'node:crypto';

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const ORIGIN = /https?:\/\/[^/\s)]+/g;
const POSITION = /(?::\d+){1,2}\)?$/;
/** Сколько верхних строк стека учитывается: выше — вызов из браузера, ниже — всё разное. */
const STACK_LINES = 4;

/** Текст ошибки без того, что меняется от случая к случаю: id и числа. */
export function normalizeMessage(message: string): string {
  return message.replace(UUID, '<id>').replace(/\d+/g, '#').trim().slice(0, 200);
}

/**
 * Верх стека без адресов сайта и номеров строк и столбцов: после новой сборки файла они
 * сдвигаются, а ошибка та же. Работает с форматами V8 (`at f (url:1:2)`) и Safari / Firefox
 * (`f@url:1:2`).
 */
export function normalizeStack(stack: string | null | undefined): string {
  if (!stack) return '';
  return stack
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /^at\s/.test(line) || line.includes('@'))
    .slice(0, STACK_LINES)
    .map((line) => line.replace(ORIGIN, '').replace(POSITION, ''))
    .join('|');
}

export interface FingerprintInput {
  kind: string;
  message: string;
  stack?: string | null;
  appVersion: string;
}

/**
 * Отпечаток ошибки: одинаковые ошибки одной версии приложения совпадают. Версия входит в него
 * намеренно — после исправления ошибка, которая вернулась в новой версии, видна заново.
 */
export function errorFingerprint(input: FingerprintInput): string {
  const parts = [
    input.kind,
    input.appVersion,
    normalizeMessage(input.message),
    normalizeStack(input.stack),
  ];
  return createHash('sha256').update(parts.join('\n')).digest('hex');
}

/** Уведомлять в Telegram: первая ошибка и затем 10-я, 100-я, 1000-я… — без потока сообщений. */
export function isNotifyCount(count: number): boolean {
  if (count === 1) return true;
  if (count < 10) return false;
  return /^10*$/.test(String(count));
}

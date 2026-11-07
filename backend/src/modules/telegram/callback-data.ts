/**
 * Данные кнопок бота модерации: `<действие>:<id предложения>` (≤ 64 байт, лимит Telegram).
 * Нажатие приходит от клиента Telegram — данные проверяются перед использованием.
 */
export const MODERATION_ACTIONS = ['approve', 'reject', 'block', 'unblock'] as const;
export type ModerationAction = (typeof MODERATION_ACTIONS)[number];

const CODE: Record<ModerationAction, string> = {
  approve: 'a',
  reject: 'r',
  block: 'b',
  unblock: 'u',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export function encodeCallback(action: ModerationAction, submissionId: string): string {
  return `${CODE[action]}:${submissionId}`;
}

/** Разбор данных кнопки; чужие или испорченные данные — `null`. */
export function parseCallback(
  data: string | undefined,
): { action: ModerationAction; submissionId: string } | null {
  if (!data) return null;
  const [code, submissionId, ...rest] = data.split(':');
  if (rest.length > 0 || !submissionId || !UUID.test(submissionId)) return null;
  const action = MODERATION_ACTIONS.find((candidate) => CODE[candidate] === code);
  return action ? { action, submissionId } : null;
}

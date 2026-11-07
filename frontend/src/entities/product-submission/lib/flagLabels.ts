/**
 * Причины отклонения автомодерацией — по коду замечания (сервер текстов не присылает).
 * Неизвестный код — общая формулировка.
 */
const REJECT_REASON: Record<string, string> = {
  banned_words: 'в названии недопустимые слова',
  link_or_contact: 'в названии ссылка или контакт',
  gibberish: 'название не похоже на продукт',
};

export function rejectionReason(flags: readonly string[]): string {
  for (const flag of flags) {
    const reason = REJECT_REASON[flag];
    if (reason) return reason;
  }
  return 'не прошло проверку';
}

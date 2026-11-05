/**
 * Русское склонение по числу: plural(21, ['год', 'года', 'лет']) → 'год'.
 * Формы: [1, 2–4, 5–20 и 0].
 */
export const plural = (
  count: number,
  [one, few, many]: readonly [string, string, string],
): string => {
  const n = Math.abs(Math.trunc(count)) % 100;
  const last = n % 10;
  if (n >= 11 && n <= 14) return many;
  if (last === 1) return one;
  if (last >= 2 && last <= 4) return few;
  return many;
};

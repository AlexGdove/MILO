/** Парсит число из пользовательского ввода, поддерживая запятую как разделитель. */
export const parseNumber = (value: string): number | null => {
  const normalized = value.trim().replace(',', '.');
  if (normalized === '') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

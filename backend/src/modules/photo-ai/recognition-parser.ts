export interface RecognizedIngredient {
  name: string;
  grams: number;
}

export interface RecognizedDish {
  dish: string | null;
  ingredients: RecognizedIngredient[];
}

export const MAX_INGREDIENTS = 20;
export const MAX_GRAMS = 3000;
export const MAX_NAME_LENGTH = 80;

/** Граммы числом или строкой «150»: только конечное число больше нуля, целое, в пределах 1…MAX_GRAMS. */
function parseGrams(raw: unknown): number | null {
  const value = typeof raw === 'string' ? Number(raw) : raw;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(MAX_GRAMS, Math.max(1, Math.round(value)));
}

function parseName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const name = raw.trim().slice(0, MAX_NAME_LENGTH);
  return name === '' ? null : name;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Разбор ответа модели — недоверенного текста: JSON берётся между первой `{` и последней `}`
 * (так отбрасываются markdown-ограждения и слова вокруг), негодные ингредиенты пропускаются,
 * длины и граммы ограничиваются. Не JSON-объект — `null`.
 */
export function parseRecognition(raw: string): RecognizedDish | null {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end <= start) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;

  const ingredients: RecognizedIngredient[] = [];
  for (const item of Array.isArray(parsed.ingredients) ? (parsed.ingredients as unknown[]) : []) {
    if (ingredients.length === MAX_INGREDIENTS) break;
    if (!isRecord(item)) continue;
    const name = parseName(item.name);
    const grams = parseGrams(item.grams);
    if (name !== null && grams !== null) ingredients.push({ name, grams });
  }
  return { dish: parseName(parsed.dish), ingredients };
}

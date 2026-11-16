import { FOOD_REFERENCE, type ReferenceFood } from './food-reference.js';

/**
 * Название продукта для сравнения: нижний регистр, `ё` → `е`, без текста в скобках и знаков
 * препинания, одиночные пробелы.
 */
export function normalizeFoodName(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^\p{L}\p{N}% ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

interface NormalizedFood {
  food: ReferenceFood;
  name: string;
  aliases: string[];
}

const cache = new WeakMap<readonly ReferenceFood[], NormalizedFood[]>();

function normalized(foods: readonly ReferenceFood[]): NormalizedFood[] {
  let list = cache.get(foods);
  if (!list) {
    list = foods.map((food) => ({
      food,
      name: normalizeFoodName(food.name),
      aliases: food.aliases.map(normalizeFoodName),
    }));
    cache.set(foods, list);
  }
  return list;
}

const words = (value: string): string[] => value.split(' ').filter((word) => word !== '');

/**
 * Запись справочника для названия, которое вернула модель; `null` — подходящей нет.
 * Порядок: (а) точное совпадение — сначала с названиями всех записей, затем с синонимами
 * («масло сливочное» не должно попасть в синоним «масло»); (б) запись, все слова названия или
 * синонима которой есть в запросе («яйцо куриное жареное» → «яйцо куриное»), — с наибольшим
 * числом слов; (в) запись, название которой содержит все слова запроса («гороховый» →
 * «гороховый суп»), — самое короткое. При равенстве — та, что раньше в справочнике.
 */
export function matchFood(
  name: string,
  foods: readonly ReferenceFood[] = FOOD_REFERENCE,
): ReferenceFood | null {
  const query = normalizeFoodName(name);
  if (query === '') return null;
  const list = normalized(foods);

  const byName = list.find((item) => item.name === query);
  if (byName) return byName.food;
  const byAlias = list.find((item) => item.aliases.includes(query));
  if (byAlias) return byAlias.food;

  const queryWords = new Set(words(query));

  let contained: { food: ReferenceFood; size: number } | null = null;
  for (const item of list) {
    for (const candidate of [item.name, ...item.aliases]) {
      const candidateWords = words(candidate);
      const fits =
        candidateWords.length > 0 && candidateWords.every((word) => queryWords.has(word));
      if (fits && (contained === null || candidateWords.length > contained.size)) {
        contained = { food: item.food, size: candidateWords.length };
      }
    }
  }
  if (contained) return contained.food;

  let containing: { food: ReferenceFood; size: number } | null = null;
  for (const item of list) {
    const nameWords = words(item.name);
    const fits = [...queryWords].every((word) => nameWords.includes(word));
    if (fits && (containing === null || nameWords.length < containing.size)) {
      containing = { food: item.food, size: nameWords.length };
    }
  }
  return containing?.food ?? null;
}

import {
  createId,
  EMPTY_NUTRIENTS,
  nutrientsForGrams,
  parseNumber,
  sumNutrients,
  type Nutrients,
} from '@/shared/lib';

/** Ингредиент из ответа сервера (`POST /photo-ai/recognize`). */
export interface RecognizedIngredient {
  name: string;
  grams: number;
  /** Запись справочника сервера, по которой взято КБЖУ */
  matchedName: string | null;
  per100g: Nutrients | null;
}

export interface Recognition {
  dish: string;
  ingredients: RecognizedIngredient[];
  /** Суточный лимит тарифа: `limit: null` — без лимита */
  usage: { used: number | null; limit: number | null };
}

/** Свой продукт пользователя, из которого можно взять КБЖУ. */
export interface OwnProduct {
  id: string;
  name: string;
  per100g: Nutrients;
}

/** Строка ингредиента в форме проверки. */
export interface DishIngredient {
  key: string;
  /** Как продукт назвала модель */
  name: string;
  /** Текст поля «граммы» */
  gramsInput: string;
  /** `null` — КБЖУ неизвестно: нужно выбрать свой продукт или убрать ингредиент */
  per100g: Nutrients | null;
  /** Чьё КБЖУ: запись справочника или свой продукт */
  sourceName: string | null;
  /** Свой продукт, если КБЖУ взято из него */
  productId: string | null;
}

export interface DishTotals {
  /** Вес и КБЖУ учтённых ингредиентов (с годными граммами и известным КБЖУ) */
  grams: number;
  nutrients: Nutrients;
  /** КБЖУ на 100 г блюда; для пустого блюда — нули */
  per100g: Nutrients;
  /** Ингредиентов без КБЖУ */
  unresolved: number;
  /** Ингредиентов с негодными граммами */
  invalid: number;
}

const sameName = (a: string, b: string) =>
  a.trim().toLocaleLowerCase('ru-RU') === b.trim().toLocaleLowerCase('ru-RU');

/**
 * Строки формы из ответа сервера. КБЖУ — из справочника сервера; если там продукта нет,
 * берётся свой продукт с таким же названием (данные кладовой при этом остаются на устройстве).
 */
export const toDishIngredients = (
  recognition: Recognition,
  products: readonly OwnProduct[],
): DishIngredient[] =>
  recognition.ingredients.map((ingredient) => {
    const base = { key: createId(), name: ingredient.name, gramsInput: String(ingredient.grams) };
    if (ingredient.per100g !== null) {
      return {
        ...base,
        per100g: ingredient.per100g,
        sourceName: ingredient.matchedName,
        productId: null,
      };
    }
    const own = products.find((product) => sameName(product.name, ingredient.name));
    return own
      ? { ...base, per100g: own.per100g, sourceName: own.name, productId: own.id }
      : { ...base, per100g: null, sourceName: null, productId: null };
  });

export const setIngredientGrams = (
  list: readonly DishIngredient[],
  key: string,
  gramsInput: string,
): DishIngredient[] => list.map((item) => (item.key === key ? { ...item, gramsInput } : item));

/** Взять КБЖУ ингредиента из своего продукта; `null` — снова «неизвестно». */
export const setIngredientProduct = (
  list: readonly DishIngredient[],
  key: string,
  product: OwnProduct | null,
): DishIngredient[] =>
  list.map((item) => {
    if (item.key !== key) return item;
    return product === null
      ? { ...item, per100g: null, sourceName: null, productId: null }
      : { ...item, per100g: product.per100g, sourceName: product.name, productId: product.id };
  });

export const removeIngredient = (list: readonly DishIngredient[], key: string): DishIngredient[] =>
  list.filter((item) => item.key !== key);

/** Граммы строки; `null` — в поле не число или не больше нуля. */
export const ingredientGrams = (item: DishIngredient): number | null => {
  const grams = parseNumber(item.gramsInput);
  return grams !== null && grams > 0 ? grams : null;
};

export const dishTotals = (list: readonly DishIngredient[]): DishTotals => {
  let unresolved = 0;
  let invalid = 0;
  let grams = 0;
  const parts: Nutrients[] = [];

  for (const item of list) {
    if (item.per100g === null) unresolved += 1;
    const itemGrams = ingredientGrams(item);
    if (itemGrams === null) {
      invalid += 1;
      continue;
    }
    if (item.per100g !== null) {
      grams += itemGrams;
      parts.push(nutrientsForGrams(item.per100g, itemGrams));
    }
  }

  const nutrients = sumNutrients(parts);
  const per100g = grams > 0 ? nutrientsForGrams(nutrients, 10_000 / grams) : EMPTY_NUTRIENTS;
  return { grams, nutrients, per100g, unresolved, invalid };
};

/** Блюдо можно записать: есть название и ингредиенты, у всех — годные граммы и КБЖУ. */
export const canSaveDish = (name: string, list: readonly DishIngredient[]): boolean => {
  if (name.trim() === '' || list.length === 0) return false;
  const totals = dishTotals(list);
  return totals.unresolved === 0 && totals.invalid === 0;
};

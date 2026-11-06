/** Продукт из Open Food Facts (данные ODbL) с КБЖУ на 100 г / 100 мл. */
export interface CatalogFood {
  /** Штрихкод товара в Open Food Facts */
  code: string;
  name: string;
  brand: string | null;
  /** «ml» — если в упаковке указан объём (мл, л), иначе «g» */
  unit: 'g' | 'ml';
  per100g: { kcal: number; protein: number; fat: number; carbs: number };
}

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

/** Продукт общей базы MILO (`GET /products`, принят модерацией). */
export interface SharedProduct {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  unit: 'g' | 'ml' | 'pcs';
  /** Вес штуки, г — для `pcs` */
  pieceWeight: number | null;
  per100g: { kcal: number; protein: number; fat: number; carbs: number };
}

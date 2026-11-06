// Разбор товара Open Food Facts в продукт каталога (решение №53). Та же логика — в backend
// (`modules/food-catalog/off-parser.ts`): приложение и поиск по штрихкоду ходят в Open Food
// Facts напрямую, поиск по названию в браузере — через сервер (там CORS закрыт).

import type { CatalogFood } from '../model/types';

interface OffNutriments {
  'energy-kcal_100g'?: unknown;
  proteins_100g?: unknown;
  fat_100g?: unknown;
  carbohydrates_100g?: unknown;
}

export interface OffProduct {
  code?: unknown;
  product_name?: unknown;
  product_name_ru?: unknown;
  brands?: unknown;
  quantity?: unknown;
  nutriments?: OffNutriments;
}

/** Поля, которые запрашиваются у Open Food Facts — ничего лишнего. */
export const OFF_FIELDS = 'code,product_name,product_name_ru,brands,quantity,nutriments';

const round2 = (value: number) => Math.round(value * 100) / 100;

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
};

const number = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? round2(value) : null;

/**
 * Товар → продукт MILO; без названия, без любой из четырёх цифр КБЖУ или с невозможными
 * значениями (как проверяет форма продукта) — `null`, такой товар не показываем.
 */
export function parseOffProduct(raw: OffProduct): CatalogFood | null {
  const code = typeof raw.code === 'string' && /^\d{6,14}$/.test(raw.code) ? raw.code : null;
  const name = text(raw.product_name_ru, 120) ?? text(raw.product_name, 120);
  if (!code || !name) return null;

  const n = raw.nutriments ?? {};
  const kcal = number(n['energy-kcal_100g']);
  const protein = number(n.proteins_100g);
  const fat = number(n.fat_100g);
  const carbs = number(n.carbohydrates_100g);
  if (kcal === null || protein === null || fat === null || carbs === null) return null;
  if (kcal < 0 || kcal > 900) return null;
  if ([protein, fat, carbs].some((v) => v < 0 || v > 100)) return null;
  if (protein + fat + carbs > 100) return null;

  const brands = Array.isArray(raw.brands) ? raw.brands[0] : raw.brands;
  const brand = text(typeof brands === 'string' ? brands.split(',')[0] : null, 80);
  const quantity = typeof raw.quantity === 'string' ? raw.quantity : '';
  // `\b` не работает после кириллицы, поэтому «не буква дальше» через \p{L}
  const unit = /\d\s*(мл|ml|л|l)(?!\p{L})/iu.test(quantity) ? 'ml' : 'g';

  return { code, name, brand, unit, per100g: { kcal, protein, fat, carbs } };
}

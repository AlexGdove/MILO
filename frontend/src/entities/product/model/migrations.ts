import { isUnit } from '@/shared/lib';

import type { Product } from './types';
import { normalizeBarcode } from '../lib/barcode';

/** Текущая версия сохранённого состояния стора продуктов. */
export const PRODUCTS_STORAGE_VERSION = 2;

interface PersistedProducts {
  products: Product[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** v1 → v2: остаток был в граммах, единиц и минимального остатка не было. */
const migrateProductV1 = (raw: Record<string, unknown>): Record<string, unknown> => ({
  ...raw,
  unit: 'g',
  minStock: 0,
});

/** Приводит продукт к текущей форме; некорректные записи отбрасываются (null). */
const normalizeProduct = (raw: unknown): Product | null => {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  const per100g = isRecord(raw.per100g) ? raw.per100g : {};
  const unit = isUnit(raw.unit) ? raw.unit : 'g';
  const pieceWeight = toNumber(raw.pieceWeight);
  const barcode = normalizeBarcode(typeof raw.barcode === 'string' ? raw.barcode : null);
  return {
    id: raw.id,
    name: raw.name,
    per100g: {
      kcal: toNumber(per100g.kcal),
      protein: toNumber(per100g.protein),
      fat: toNumber(per100g.fat),
      carbs: toNumber(per100g.carbs),
    },
    unit,
    ...(unit === 'pcs' && pieceWeight > 0 ? { pieceWeight } : {}),
    ...(barcode ? { barcode } : {}),
    stock: Math.max(0, toNumber(raw.stock)),
    minStock: Math.max(0, toNumber(raw.minStock)),
    createdAt: toNumber(raw.createdAt, Date.now()),
  };
};

/**
 * Миграция сохранённого состояния: каждая старая версия поднимается шаг за шагом.
 * Без неё Zustand отбросил бы данные пользователя при смене версии.
 */
export const migrateProducts = (persisted: unknown, version: number): PersistedProducts => {
  const rawProducts =
    isRecord(persisted) && Array.isArray(persisted.products) ? persisted.products : [];

  const upgraded = rawProducts.map((raw) => {
    if (!isRecord(raw)) return raw;
    let product: Record<string, unknown> = raw;
    if (version < 2) product = migrateProductV1(product);
    return product;
  });

  return {
    products: upgraded.map(normalizeProduct).filter((p): p is Product => p !== null),
  };
};

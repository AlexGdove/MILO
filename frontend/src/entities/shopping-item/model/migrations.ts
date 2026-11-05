import { isUnit } from '@/shared/lib';

import type { ShoppingItem } from './types';

/** Текущая версия сохранённого состояния списка покупок. */
export const SHOPPING_STORAGE_VERSION = 1;

interface PersistedShopping {
  items: ShoppingItem[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** Приводит позицию к текущей форме; некорректные записи отбрасываются (null). */
const normalizeItem = (raw: unknown): ShoppingItem | null => {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.productId !== 'string') {
    return null;
  }
  return {
    id: raw.id,
    productId: raw.productId,
    name: typeof raw.name === 'string' ? raw.name : '',
    amount: Math.max(0, toNumber(raw.amount)),
    unit: isUnit(raw.unit) ? raw.unit : 'g',
    checked: raw.checked === true,
    createdAt: toNumber(raw.createdAt, Date.now()),
  };
};

/**
 * Миграция сохранённого списка покупок. Версия 1 — первая: шагов пока нет, только нормализация.
 * При изменении формы повышается SHOPPING_STORAGE_VERSION и добавляется шаг по версии,
 * как в сторе продуктов.
 */
export const migrateShopping = (persisted: unknown): PersistedShopping => {
  const rawItems = isRecord(persisted) && Array.isArray(persisted.items) ? persisted.items : [];
  return {
    items: rawItems.map(normalizeItem).filter((item): item is ShoppingItem => item !== null),
  };
};

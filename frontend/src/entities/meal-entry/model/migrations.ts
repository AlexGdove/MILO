import { isUnit } from '@/shared/lib';

import { MEAL_TYPES } from './mealTypes';
import type { MealEntry, MealType } from './types';

/** Текущая версия сохранённого состояния дневника. */
export const MEAL_ENTRIES_STORAGE_VERSION = 2;

interface PersistedMealEntries {
  entries: MealEntry[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const isMealType = (value: unknown): value is MealType =>
  MEAL_TYPES.some((meal) => meal.value === value);

/** v1 → v2: была ссылка productId и вес в граммах; списание тоже в граммах. */
const migrateEntryV1 = (raw: Record<string, unknown>): Record<string, unknown> => {
  const { productId, ...rest } = raw;
  return {
    ...rest,
    source: { type: 'product', id: productId },
    amount: rest.grams,
    unit: 'g',
  };
};

const normalizeEntry = (raw: unknown): MealEntry | null => {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.date !== 'string') return null;
  const source = isRecord(raw.source) ? raw.source : {};
  if (typeof source.id !== 'string') return null;
  const per100g = isRecord(raw.per100g) ? raw.per100g : {};
  const grams = Math.max(0, toNumber(raw.grams));
  return {
    id: raw.id,
    date: raw.date,
    mealType: isMealType(raw.mealType) ? raw.mealType : 'snack',
    source: { type: source.type === 'recipe' ? 'recipe' : 'product', id: source.id },
    productName: typeof raw.productName === 'string' ? raw.productName : '',
    per100g: {
      kcal: toNumber(per100g.kcal),
      protein: toNumber(per100g.protein),
      fat: toNumber(per100g.fat),
      carbs: toNumber(per100g.carbs),
    },
    amount: Math.max(0, toNumber(raw.amount, grams)),
    unit: isUnit(raw.unit) ? raw.unit : 'g',
    grams,
    stockDeducted: Math.max(0, toNumber(raw.stockDeducted)),
    createdAt: toNumber(raw.createdAt, Date.now()),
  };
};

/** Миграция сохранённых записей дневника, шаг за шагом по версиям. */
export const migrateMealEntries = (persisted: unknown, version: number): PersistedMealEntries => {
  const rawEntries =
    isRecord(persisted) && Array.isArray(persisted.entries) ? persisted.entries : [];

  const upgraded = rawEntries.map((raw) => {
    if (!isRecord(raw)) return raw;
    let entry: Record<string, unknown> = raw;
    if (version < 2) entry = migrateEntryV1(entry);
    return entry;
  });

  return {
    entries: upgraded.map(normalizeEntry).filter((e): e is MealEntry => e !== null),
  };
};

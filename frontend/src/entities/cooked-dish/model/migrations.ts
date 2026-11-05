import type { CookedDish } from './types';

/** Текущая версия сохранённого состояния приготовленных блюд. */
export const COOKED_DISHES_STORAGE_VERSION = 1;

interface PersistedCookedDishes {
  dishes: CookedDish[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

/** Приводит блюдо к текущей форме; некорректные записи отбрасываются (null). */
export const normalizeDish = (raw: unknown): CookedDish | null => {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  const per100g = isRecord(raw.per100g) ? raw.per100g : {};
  const servingsTotal = Math.max(1, Math.round(toNumber(raw.servingsTotal, 1)));
  return {
    id: raw.id,
    recipeId: typeof raw.recipeId === 'string' ? raw.recipeId : '',
    name: raw.name,
    servingsTotal,
    servingsLeft: Math.min(servingsTotal, Math.max(0, Math.round(toNumber(raw.servingsLeft)))),
    portionGrams: Math.max(0, toNumber(raw.portionGrams)),
    per100g: {
      kcal: toNumber(per100g.kcal),
      protein: toNumber(per100g.protein),
      fat: toNumber(per100g.fat),
      carbs: toNumber(per100g.carbs),
    },
    cookedAt: toNumber(raw.cookedAt, Date.now()),
  };
};

/** Миграция сохранённых блюд. Версия 1 — первая: шагов пока нет, только нормализация. */
export const migrateCookedDishes = (persisted: unknown): PersistedCookedDishes => {
  const raw = isRecord(persisted) && Array.isArray(persisted.dishes) ? persisted.dishes : [];
  return { dishes: raw.map(normalizeDish).filter((d): d is CookedDish => d !== null) };
};

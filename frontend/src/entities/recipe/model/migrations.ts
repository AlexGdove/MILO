import { isUnit } from '@/shared/lib';

import type { Recipe, RecipeIngredient } from './types';

/** Текущая версия сохранённого состояния рецептов. */
export const RECIPES_STORAGE_VERSION = 1;

interface PersistedRecipes {
  recipes: Recipe[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toNumber = (value: unknown, fallback = 0): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback;

const normalizeIngredient = (raw: unknown): RecipeIngredient | null => {
  if (!isRecord(raw) || typeof raw.productId !== 'string') return null;
  const amount = toNumber(raw.amount);
  if (amount <= 0) return null;
  return { productId: raw.productId, amount, unit: isUnit(raw.unit) ? raw.unit : 'g' };
};

/** Приводит рецепт к текущей форме; некорректные записи отбрасываются (null). */
export const normalizeRecipe = (raw: unknown): Recipe | null => {
  if (!isRecord(raw) || typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  const ingredients = Array.isArray(raw.ingredients) ? raw.ingredients : [];
  return {
    id: raw.id,
    name: raw.name,
    servings: Math.max(1, Math.round(toNumber(raw.servings, 1))),
    ingredients: ingredients
      .map(normalizeIngredient)
      .filter((item): item is RecipeIngredient => item !== null),
    createdAt: toNumber(raw.createdAt, Date.now()),
  };
};

/** Миграция сохранённых рецептов. Версия 1 — первая: шагов пока нет, только нормализация. */
export const migrateRecipes = (persisted: unknown): PersistedRecipes => {
  const raw = isRecord(persisted) && Array.isArray(persisted.recipes) ? persisted.recipes : [];
  return { recipes: raw.map(normalizeRecipe).filter((r): r is Recipe => r !== null) };
};

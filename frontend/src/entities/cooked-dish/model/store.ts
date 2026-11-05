import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { createId, persistStorage, storageKey } from '@/shared/lib';

import { COOKED_DISHES_STORAGE_VERSION, migrateCookedDishes } from './migrations';
import type { CookedDish, CookedDishDraft } from './types';

interface CookedDishState {
  /** Все приготовленные блюда, включая доеденные (servingsLeft 0) — они нужны для истории */
  dishes: CookedDish[];
  addDish: (draft: CookedDishDraft) => CookedDish;
  /** Съесть порции; возвращает, сколько реально списано (не больше остатка). */
  eatPortions: (id: string, count: number) => number;
  /** Вернуть порции (удалена запись о съеденном); не больше, чем было приготовлено. */
  returnPortions: (id: string, count: number) => void;
  /** Остаток выброшен/отдан: порций 0, запись остаётся в истории. */
  discardRest: (id: string) => void;
}

const updateDish = (
  dishes: CookedDish[],
  id: string,
  update: (dish: CookedDish) => CookedDish,
): CookedDish[] => dishes.map((dish) => (dish.id === id ? update(dish) : dish));

export const useCookedDishStore = create<CookedDishState>()(
  persist(
    (set, get) => ({
      dishes: [],

      addDish: (draft) => {
        const dish: CookedDish = {
          ...draft,
          id: createId(),
          servingsLeft: draft.servingsTotal,
          cookedAt: Date.now(),
        };
        set((state) => ({ dishes: [dish, ...state.dishes] }));
        return dish;
      },

      eatPortions: (id, count) => {
        const dish = get().dishes.find((item) => item.id === id);
        if (!dish) return 0;
        const eaten = Math.max(0, Math.min(Math.round(count), dish.servingsLeft));
        if (eaten > 0) {
          set((state) => ({
            dishes: updateDish(state.dishes, id, (d) => ({
              ...d,
              servingsLeft: d.servingsLeft - eaten,
            })),
          }));
        }
        return eaten;
      },

      returnPortions: (id, count) =>
        set((state) => ({
          dishes: updateDish(state.dishes, id, (d) => ({
            ...d,
            servingsLeft: Math.min(
              d.servingsTotal,
              d.servingsLeft + Math.max(0, Math.round(count)),
            ),
          })),
        })),

      discardRest: (id) =>
        set((state) => ({
          dishes: updateDish(state.dishes, id, (d) => ({ ...d, servingsLeft: 0 })),
        })),
    }),
    {
      name: storageKey('cooked-dishes'),
      storage: persistStorage,
      version: COOKED_DISHES_STORAGE_VERSION,
      migrate: migrateCookedDishes,
      partialize: (state) => ({ dishes: state.dishes }),
    },
  ),
);

export const selectCookedDishes = (state: CookedDishState) => state.dishes;

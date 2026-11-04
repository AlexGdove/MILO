import { useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  createId,
  nutrientsForGrams,
  persistStorage,
  storageKey,
  sumNutrients,
  type IsoDate,
  type Nutrients,
} from '@/shared/lib';

import { MEAL_ENTRIES_STORAGE_VERSION, migrateMealEntries } from './migrations';
import type { MealEntry, MealEntryDraft } from './types';

interface MealEntryState {
  entries: MealEntry[];
  addEntry: (draft: MealEntryDraft) => MealEntry;
  removeEntry: (id: string) => MealEntry | undefined;
}

export const useMealEntryStore = create<MealEntryState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (draft) => {
        const entry: MealEntry = { ...draft, id: createId(), createdAt: Date.now() };
        set((state) => ({ entries: [...state.entries, entry] }));
        return entry;
      },

      removeEntry: (id) => {
        const entry = get().entries.find((item) => item.id === id);
        set((state) => ({ entries: state.entries.filter((item) => item.id !== id) }));
        return entry;
      },
    }),
    {
      name: storageKey('meal-entries'),
      storage: persistStorage,
      version: MEAL_ENTRIES_STORAGE_VERSION,
      migrate: migrateMealEntries,
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);

export const entryNutrients = (entry: MealEntry): Nutrients =>
  nutrientsForGrams(entry.per100g, entry.grams);

export const totalNutrients = (entries: MealEntry[]): Nutrients =>
  sumNutrients(entries.map(entryNutrients));

/** Записи за день (пересчитываются только при изменении записей или даты). */
export const useDayEntries = (date: IsoDate): MealEntry[] => {
  const entries = useMealEntryStore((state) => state.entries);
  return useMemo(() => entries.filter((entry) => entry.date === date), [entries, date]);
};

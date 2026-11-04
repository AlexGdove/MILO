import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, storageKey, type Nutrients } from '@/shared/lib';

/** Дневная норма: калории и БЖУ в граммах. */
export type DailyGoal = Nutrients;

export const DEFAULT_GOAL: DailyGoal = { kcal: 2000, protein: 100, fat: 70, carbs: 250 };

interface UserGoalState {
  goal: DailyGoal;
  setGoal: (goal: DailyGoal) => void;
}

export const useUserGoalStore = create<UserGoalState>()(
  persist(
    (set) => ({
      goal: DEFAULT_GOAL,
      setGoal: (goal) => set({ goal }),
    }),
    { name: storageKey('user-goal'), storage: persistStorage, version: 1 },
  ),
);

export const useDailyGoal = () => useUserGoalStore((state) => state.goal);

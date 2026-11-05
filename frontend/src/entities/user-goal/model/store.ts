import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, storageKey, type Nutrients } from '@/shared/lib';

/** Дневная норма: калории и БЖУ в граммах. */
export type DailyGoal = Nutrients;

/** Откуда норма: рассчитана по профилю или задана вручную (решение №30). */
export type GoalMode = 'auto' | 'manual';

export const DEFAULT_GOAL: DailyGoal = { kcal: 2000, protein: 100, fat: 70, carbs: 250 };

/** Текущая версия сохранённой нормы. */
export const USER_GOAL_STORAGE_VERSION = 2;

interface UserGoalState {
  goal: DailyGoal;
  mode: GoalMode;
  /** Своя норма вручную */
  setGoal: (goal: DailyGoal) => void;
  /** Норма, рассчитанная по профилю */
  setAutoGoal: (goal: DailyGoal) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toGoal = (raw: unknown): DailyGoal => {
  const value = isRecord(raw) ? raw : {};
  const num = (key: keyof DailyGoal) =>
    typeof value[key] === 'number' && Number.isFinite(value[key])
      ? (value[key] as number)
      : DEFAULT_GOAL[key];
  return { kcal: num('kcal'), protein: num('protein'), fat: num('fat'), carbs: num('carbs') };
};

/**
 * v1 → v2: появился режим нормы. Цель, сохранённая до v2, задана вручную (или по умолчанию),
 * поэтому получает режим «manual» и не перезаписывается расчётом по профилю без согласия.
 */
export const migrateUserGoal = (
  persisted: unknown,
  version: number,
): Pick<UserGoalState, 'goal' | 'mode'> => {
  const state = isRecord(persisted) ? persisted : {};
  const mode: GoalMode =
    version >= 2 && (state.mode === 'auto' || state.mode === 'manual') ? state.mode : 'manual';
  return { goal: toGoal(state.goal), mode };
};

export const useUserGoalStore = create<UserGoalState>()(
  persist(
    (set) => ({
      goal: DEFAULT_GOAL,
      // Новый пользователь: норма будет рассчитана по профилю после анкеты
      mode: 'auto',
      setGoal: (goal) => set({ goal, mode: 'manual' }),
      setAutoGoal: (goal) => set({ goal, mode: 'auto' }),
    }),
    {
      name: storageKey('user-goal'),
      storage: persistStorage,
      version: USER_GOAL_STORAGE_VERSION,
      migrate: migrateUserGoal,
      partialize: (state) => ({ goal: state.goal, mode: state.mode }),
    },
  ),
);

export const useDailyGoal = () => useUserGoalStore((state) => state.goal);
export const useGoalMode = () => useUserGoalStore((state) => state.mode);

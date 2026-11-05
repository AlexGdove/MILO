import { beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_GOAL, migrateUserGoal, useUserGoalStore } from './store';

const goal = { kcal: 1800, protein: 120, fat: 60, carbs: 190 };
const state = () => useUserGoalStore.getState();

beforeEach(() => {
  localStorage.clear();
  useUserGoalStore.setState(useUserGoalStore.getInitialState(), true);
});

describe('useUserGoalStore', () => {
  it('новый пользователь: норма по умолчанию, режим «по профилю»', () => {
    expect(state()).toMatchObject({ goal: DEFAULT_GOAL, mode: 'auto' });
  });

  it('своя норма переключает в ручной режим, расчёт — обратно в автоматический', () => {
    state().setGoal(goal);
    expect(state()).toMatchObject({ goal, mode: 'manual' });
    state().setAutoGoal({ ...goal, kcal: 2100 });
    expect(state()).toMatchObject({ goal: { kcal: 2100 }, mode: 'auto' });
  });

  it('v1 → v2: сохранённая раньше норма остаётся и считается своей', async () => {
    localStorage.setItem('milo:user-goal', JSON.stringify({ state: { goal }, version: 1 }));
    await useUserGoalStore.persist.rehydrate();
    expect(state()).toMatchObject({ goal, mode: 'manual' });
    expect(JSON.parse(localStorage.getItem('milo:user-goal') ?? 'null')?.version).toBe(2);
  });
});

describe('migrateUserGoal', () => {
  it('восполняет некорректные значения нормой по умолчанию', () => {
    expect(migrateUserGoal({ goal: { kcal: 'много', protein: 90 } }, 1)).toEqual({
      goal: { ...DEFAULT_GOAL, protein: 90 },
      mode: 'manual',
    });
  });

  it('v2 сохраняет режим', () => {
    expect(migrateUserGoal({ goal, mode: 'auto' }, 2)).toEqual({ goal, mode: 'auto' });
  });
});

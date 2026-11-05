import { describe, expect, it } from 'vitest';

import { basalMetabolicRate, dailyNorm, totalDailyExpenditure } from './dailyNorm';
import type { UserProfile } from '../model/types';

const man: UserProfile = {
  sex: 'male',
  age: 30,
  heightCm: 180,
  weightKg: 80,
  activity: 'moderate',
  goal: 'maintain',
};
const woman: UserProfile = {
  sex: 'female',
  age: 25,
  heightCm: 165,
  weightKg: 60,
  activity: 'sedentary',
  goal: 'lose',
};

describe('базовый обмен по формуле Миффлина — Сан Жеора', () => {
  it('для мужчин', () => {
    expect(basalMetabolicRate(man)).toBe(1780);
  });

  it('для женщин', () => {
    expect(basalMetabolicRate(woman)).toBeCloseTo(1345.25);
  });
});

describe('суточный расход учитывает коэффициент активности', () => {
  it('для мужчин', () => {
    expect(totalDailyExpenditure(man)).toBeCloseTo(2759);
  });

  it('для женщин', () => {
    expect(totalDailyExpenditure(woman)).toBeCloseTo(1614.3);
  });

  it('для мужчин с очень высокой активностью', () => {
    expect(dailyNorm({ ...man, activity: 'extreme' }).kcal).toBe(3382);
  });
});

describe('удерживать и набрать: норма и БЖУ', () => {
  it('для мужчин на поддержание', () => {
    expect(dailyNorm(man)).toEqual({ kcal: 2759, protein: 96, fat: 92, carbs: 387 });
  });

  it('для мужчин на набор', () => {
    expect(dailyNorm({ ...man, goal: 'gain' })).toEqual({
      kcal: 3059,
      protein: 128,
      fat: 102,
      carbs: 407,
    });
  });
});

describe('похудеть: дефицит 500 ккал', () => {
  it('для мужчин', () => {
    expect(dailyNorm({ ...man, goal: 'lose' }).kcal).toBe(2259);
  });
});

describe('похудеть: не ниже безопасного минимума', () => {
  it('для женщин (дефицит дал бы 1114 ккал — норма 1200)', () => {
    expect(dailyNorm(woman)).toEqual({ kcal: 1200, protein: 96, fat: 40, carbs: 114 });
  });

  it('для женщин на поддержание', () => {
    expect(dailyNorm({ ...woman, goal: 'maintain' }).kcal).toBe(1614);
  });
});

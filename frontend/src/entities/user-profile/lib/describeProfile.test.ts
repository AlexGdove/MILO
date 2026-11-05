import { describe, expect, it } from 'vitest';

import { describeProfile } from './describeProfile';

describe('describeProfile', () => {
  it('кратко описывает профиль со склонением возраста', () => {
    expect(
      describeProfile({
        sex: 'female',
        age: 25,
        heightCm: 165,
        weightKg: 60.5,
        activity: 'light',
        goal: 'lose',
      }),
    ).toBe('Женщина, 25 лет · 165 см · 60,5 кг · Лёгкая активность · Похудеть');
    expect(
      describeProfile({
        sex: 'male',
        age: 21,
        heightCm: 180,
        weightKg: 80,
        activity: 'moderate',
        goal: 'maintain',
      }),
    ).toBe('Мужчина, 21 год · 180 см · 80 кг · Средняя активность · Удерживать');
  });
});

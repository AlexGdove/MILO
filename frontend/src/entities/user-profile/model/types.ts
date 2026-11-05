export type Sex = 'male' | 'female';

/** Уровень активности — коэффициенты к базовому обмену (см. lib/dailyNorm.ts). */
export type Activity = 'sedentary' | 'light' | 'moderate' | 'high' | 'extreme';

/** Цель по весу. */
export type WeightGoal = 'lose' | 'maintain' | 'gain';

export interface UserProfile {
  sex: Sex;
  /** Полных лет */
  age: number;
  heightCm: number;
  weightKg: number;
  activity: Activity;
  goal: WeightGoal;
}

/** Анкета при первом запуске: заполнена или отложена («Позже»); undefined — ещё не показывалась. */
export type OnboardingState = 'done' | 'later';

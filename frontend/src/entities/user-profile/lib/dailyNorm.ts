import type { Nutrients } from '@/shared/lib';

import type { Activity, Sex, UserProfile, WeightGoal } from '../model/types';

/**
 * Расчёт дневной нормы (решение №30).
 *
 * Базовый обмен — уравнение Миффлина — Сан Жеора (Mifflin, St Jeor, 1990):
 *   10 × вес(кг) + 6,25 × рост(см) − 5 × возраст + 5 (мужчины) / − 161 (женщины).
 * Суточный расход — базовый обмен × коэффициент активности 1,2 / 1,375 / 1,55 / 1,725 / 1,9.
 * Цель: похудеть — −500 ккал, но не ниже 1200 (женщины) / 1500 (мужчины) без врача;
 * удерживать — без изменений; набрать — +300 ккал (рекомендуемый профицит 250–500).
 * БЖУ: белок 1,6 г/кг (похудеть, набрать) или 1,2 г/кг (удерживать), жиры 30 % ккал, углеводы — остаток.
 * Это ориентир, а не медицинская рекомендация.
 */

export const ACTIVITY_LEVELS: ReadonlyArray<{
  value: Activity;
  factor: number;
  label: string;
  description: string;
}> = [
  {
    value: 'sedentary',
    factor: 1.2,
    label: 'Минимальная',
    description: 'Сидячая работа, почти без тренировок',
  },
  { value: 'light', factor: 1.375, label: 'Лёгкая', description: 'Тренировки 1–3 раза в неделю' },
  { value: 'moderate', factor: 1.55, label: 'Средняя', description: 'Тренировки 3–5 раз в неделю' },
  { value: 'high', factor: 1.725, label: 'Высокая', description: 'Тренировки 6–7 раз в неделю' },
  {
    value: 'extreme',
    factor: 1.9,
    label: 'Очень высокая',
    description: 'Физический труд или 2 тренировки в день',
  },
];

export const WEIGHT_GOALS: ReadonlyArray<{ value: WeightGoal; label: string }> = [
  { value: 'lose', label: 'Похудеть' },
  { value: 'maintain', label: 'Удерживать' },
  { value: 'gain', label: 'Набрать' },
];

export const SEXES: ReadonlyArray<{ value: Sex; label: string }> = [
  { value: 'female', label: 'Женский' },
  { value: 'male', label: 'Мужской' },
];

const DEFICIT_KCAL = 500;
const SURPLUS_KCAL = 300;
const MIN_KCAL: Record<Sex, number> = { female: 1200, male: 1500 };
const PROTEIN_PER_KG: Record<WeightGoal, number> = { lose: 1.6, maintain: 1.2, gain: 1.6 };
const FAT_SHARE = 0.3;

/** Базовый обмен, ккал (Миффлин — Сан Жеор). */
export const basalMetabolicRate = ({ sex, age, heightCm, weightKg }: UserProfile): number =>
  10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);

/** Суточный расход с учётом активности, ккал. */
export const totalDailyExpenditure = (profile: UserProfile): number => {
  const factor = ACTIVITY_LEVELS.find((level) => level.value === profile.activity)?.factor ?? 1.2;
  return basalMetabolicRate(profile) * factor;
};

/** Дневная норма ккал и БЖУ (г) по профилю; все значения — целые. */
export const dailyNorm = (profile: UserProfile): Nutrients => {
  const tdee = totalDailyExpenditure(profile);
  let kcal = tdee;
  if (profile.goal === 'lose') {
    // Дефицит не опускает норму ниже безопасного минимума (и не выше самого расхода)
    kcal = Math.max(tdee - DEFICIT_KCAL, Math.min(MIN_KCAL[profile.sex], tdee));
  } else if (profile.goal === 'gain') {
    kcal = tdee + SURPLUS_KCAL;
  }
  kcal = Math.round(kcal);

  const protein = Math.round(profile.weightKg * PROTEIN_PER_KG[profile.goal]);
  const fat = Math.round((kcal * FAT_SHARE) / 9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, fat, carbs };
};

/** Допустимые значения анкеты. */
export const PROFILE_LIMITS = {
  age: { min: 14, max: 100 },
  heightCm: { min: 120, max: 230 },
  weightKg: { min: 30, max: 300 },
} as const;

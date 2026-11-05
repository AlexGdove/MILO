import { plural } from '@/shared/lib';

import { ACTIVITY_LEVELS, WEIGHT_GOALS } from './dailyNorm';
import type { UserProfile } from '../model/types';

/** Кратко о профиле: «Женщина, 25 лет · 165 см · 60 кг · Лёгкая активность · Похудеть». */
export const describeProfile = (profile: UserProfile): string => {
  const activity = ACTIVITY_LEVELS.find((level) => level.value === profile.activity)?.label;
  const goal = WEIGHT_GOALS.find((item) => item.value === profile.goal)?.label;
  return [
    `${profile.sex === 'female' ? 'Женщина' : 'Мужчина'}, ${profile.age} ${plural(profile.age, ['год', 'года', 'лет'])}`,
    `${profile.heightCm} см`,
    `${String(profile.weightKg).replace('.', ',')} кг`,
    activity && `${activity} активность`,
    goal,
  ]
    .filter(Boolean)
    .join(' · ');
};

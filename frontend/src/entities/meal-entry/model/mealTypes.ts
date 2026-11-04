import type { MealType } from './types';

export const MEAL_TYPES: ReadonlyArray<{ value: MealType; label: string }> = [
  { value: 'breakfast', label: 'Завтрак' },
  { value: 'lunch', label: 'Обед' },
  { value: 'dinner', label: 'Ужин' },
  { value: 'snack', label: 'Перекус' },
];

export const mealTypeLabel = (mealType: MealType): string =>
  MEAL_TYPES.find((item) => item.value === mealType)?.label ?? mealType;

/** Приём пищи по умолчанию в зависимости от времени суток. */
export const suggestMealType = (date: Date = new Date()): MealType => {
  const hour = date.getHours();
  if (hour < 11) return 'breakfast';
  if (hour < 16) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
};

import {
  PROFILE_LIMITS,
  type Activity,
  type Sex,
  type UserProfile,
  type WeightGoal,
} from '@/entities/user-profile';
import { parseNumber } from '@/shared/lib';

/** Значения полей анкеты: числа — строками, как их вводит пользователь. */
export interface ProfileFormValues {
  sex: Sex | null;
  age: string;
  heightCm: string;
  weightKg: string;
  activity: Activity;
  goal: WeightGoal;
}

export type ProfileField = 'sex' | 'age' | 'heightCm' | 'weightKg';
export type ProfileErrors = Partial<Record<ProfileField, string>>;

export const EMPTY_PROFILE_VALUES: ProfileFormValues = {
  sex: null,
  age: '',
  heightCm: '',
  weightKg: '',
  activity: 'light',
  goal: 'maintain',
};

export const toFormValues = (profile: UserProfile | null): ProfileFormValues =>
  profile
    ? {
        sex: profile.sex,
        age: String(profile.age),
        heightCm: String(profile.heightCm),
        weightKg: String(profile.weightKg).replace('.', ','),
        activity: profile.activity,
        goal: profile.goal,
      }
    : EMPTY_PROFILE_VALUES;

const NUMBER_FIELDS = [
  { name: 'age', label: 'Возраст', unit: 'лет', integer: true },
  { name: 'heightCm', label: 'Рост', unit: 'см', integer: true },
  { name: 'weightKg', label: 'Вес', unit: 'кг', integer: false },
] as const;

/** Проверка отдельных полей (для пошаговой анкеты — только своего шага). */
export const validateProfile = (
  values: ProfileFormValues,
  fields: readonly ProfileField[] = ['sex', 'age', 'heightCm', 'weightKg'],
): ProfileErrors => {
  const errors: ProfileErrors = {};
  if (fields.includes('sex') && !values.sex) errors.sex = 'Выберите пол';
  for (const { name, label, unit, integer } of NUMBER_FIELDS) {
    if (!fields.includes(name)) continue;
    const value = parseNumber(values[name]);
    const { min, max } = PROFILE_LIMITS[name];
    if (value === null || value < min || value > max || (integer && !Number.isInteger(value))) {
      errors[name] = `${label}: ${integer ? 'целое число ' : ''}от ${min} до ${max} ${unit}`;
    }
  }
  return errors;
};

/** Готовый профиль, если все поля корректны; иначе null. */
export const toProfile = (values: ProfileFormValues): UserProfile | null => {
  if (Object.keys(validateProfile(values)).length > 0 || !values.sex) return null;
  return {
    sex: values.sex,
    age: parseNumber(values.age) as number,
    heightCm: parseNumber(values.heightCm) as number,
    weightKg: parseNumber(values.weightKg) as number,
    activity: values.activity,
    goal: values.goal,
  };
};

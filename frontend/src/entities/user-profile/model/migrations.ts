import type { Activity, OnboardingState, Sex, UserProfile, WeightGoal } from './types';

/** Текущая версия сохранённого профиля. */
export const USER_PROFILE_STORAGE_VERSION = 1;

interface PersistedProfile {
  profile: UserProfile | null;
  onboarding?: OnboardingState;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const oneOf = <T extends string>(value: unknown, options: readonly T[]): value is T =>
  typeof value === 'string' && (options as readonly string[]).includes(value);

const positive = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

const SEX_VALUES: readonly Sex[] = ['male', 'female'];
const ACTIVITY_VALUES: readonly Activity[] = ['sedentary', 'light', 'moderate', 'high', 'extreme'];
const GOAL_VALUES: readonly WeightGoal[] = ['lose', 'maintain', 'gain'];

/** Профиль целиком или null, если данных не хватает (тогда анкету надо заполнить заново). */
export const normalizeProfile = (raw: unknown): UserProfile | null => {
  if (!isRecord(raw)) return null;
  const age = positive(raw.age);
  const heightCm = positive(raw.heightCm);
  const weightKg = positive(raw.weightKg);
  if (!oneOf(raw.sex, SEX_VALUES) || age === null || heightCm === null || weightKg === null) {
    return null;
  }
  return {
    sex: raw.sex,
    age,
    heightCm,
    weightKg,
    activity: oneOf(raw.activity, ACTIVITY_VALUES) ? raw.activity : 'sedentary',
    goal: oneOf(raw.goal, GOAL_VALUES) ? raw.goal : 'maintain',
  };
};

/** Миграция сохранённого профиля. Версия 1 — первая: только нормализация. */
export const migrateUserProfile = (persisted: unknown): PersistedProfile => {
  const state = isRecord(persisted) ? persisted : {};
  const onboarding = oneOf(state.onboarding, ['done', 'later'] as const)
    ? state.onboarding
    : undefined;
  return { profile: normalizeProfile(state.profile), ...(onboarding ? { onboarding } : {}) };
};

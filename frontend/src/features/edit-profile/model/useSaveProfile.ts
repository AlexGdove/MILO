import { useUserGoalStore } from '@/entities/user-goal';
import { dailyNorm, useUserProfileStore, type UserProfile } from '@/entities/user-profile';

/**
 * Сохранить профиль. Если норма считается по профилю (режим «auto»), она пересчитывается;
 * своя норма (режим «manual») не трогается. Анкета первого запуска считается пройденной.
 */
export const useSaveProfile = () => {
  const setProfile = useUserProfileStore((state) => state.setProfile);
  const setOnboarding = useUserProfileStore((state) => state.setOnboarding);
  const setAutoGoal = useUserGoalStore((state) => state.setAutoGoal);

  return (profile: UserProfile) => {
    setProfile(profile);
    setOnboarding('done');
    if (useUserGoalStore.getState().mode === 'auto') setAutoGoal(dailyNorm(profile));
  };
};

/** Вернуться к норме по профилю (из режима «своя норма»). */
export const useApplyProfileNorm = () => {
  const profile = useUserProfileStore((state) => state.profile);
  const setAutoGoal = useUserGoalStore((state) => state.setAutoGoal);
  return profile ? () => setAutoGoal(dailyNorm(profile)) : null;
};

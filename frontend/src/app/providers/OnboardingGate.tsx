import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import { selectOnboarding, useUserProfileStore } from '@/entities/user-profile';
import { ROUTES } from '@/shared/config';

/** Первый запуск: пока анкету не прошли и не отложили — перенаправляем на приветствие (решение №30). */
export const OnboardingGate = ({ children }: { children: ReactNode }) => {
  const onboarding = useUserProfileStore(selectOnboarding);
  return onboarding ? children : <Navigate to={ROUTES.welcome} replace />;
};

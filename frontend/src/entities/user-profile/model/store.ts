import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, storageKey } from '@/shared/lib';

import { migrateUserProfile, USER_PROFILE_STORAGE_VERSION } from './migrations';
import type { OnboardingState, UserProfile } from './types';

interface UserProfileState {
  profile: UserProfile | null;
  onboarding?: OnboardingState;
  setProfile: (profile: UserProfile) => void;
  setOnboarding: (state: OnboardingState) => void;
}

export const useUserProfileStore = create<UserProfileState>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (profile) => set({ profile }),
      setOnboarding: (onboarding) => set({ onboarding }),
    }),
    {
      name: storageKey('user-profile'),
      storage: persistStorage,
      version: USER_PROFILE_STORAGE_VERSION,
      migrate: migrateUserProfile,
      partialize: (state) => ({ profile: state.profile, onboarding: state.onboarding }),
    },
  ),
);

export const selectProfile = (state: UserProfileState) => state.profile;
export const selectOnboarding = (state: UserProfileState) => state.onboarding;

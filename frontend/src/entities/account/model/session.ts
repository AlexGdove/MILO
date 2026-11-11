import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, storageKey } from '@/shared/lib';

import type { Account, IssuedSession, Plan } from './types';

/**
 * Сессия аккаунта (решение №69): токен и последний известный аккаунт. Хранится только на
 * устройстве, как ключ устройства; токен уходит лишь в заголовке `Authorization` к своему API.
 */
export const SESSION_STORAGE_KEY = storageKey('account-session');
const TOKEN_PATTERN = /^ms_[A-Za-z0-9_-]{43}$/;
const PLANS: readonly Plan[] = ['free', 'plus', 'unlimited'];

interface SessionState {
  token: string | null;
  account: Account | null;
  /** Вход выполнен: сохранить токен и аккаунт */
  signIn: (session: IssuedSession) => void;
  /** Обновить аккаунт (например, тариф после `GET /account/me`) */
  setAccount: (account: Account) => void;
  /** Выйти локально: токен забыт (сервер закрывает сессию отдельно) */
  signOut: () => void;
}

const isAccount = (value: unknown): value is Account => {
  const account = value as Partial<Account> | null;
  return (
    typeof account?.id === 'string' &&
    typeof account.email === 'string' &&
    PLANS.includes(account.plan as Plan) &&
    (account.planUntil === null || typeof account.planUntil === 'string')
  );
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      account: null,
      signIn: ({ token, account }) => set({ token, account }),
      setAccount: (account) => set({ account }),
      signOut: () => set({ token: null, account: null }),
    }),
    {
      name: SESSION_STORAGE_KEY,
      storage: persistStorage,
      version: 1,
      // Повреждённое или чужое значение — как будто не входили
      migrate: (persisted) => {
        const state = persisted as { token?: unknown; account?: unknown } | null;
        const valid =
          typeof state?.token === 'string' &&
          TOKEN_PATTERN.test(state.token) &&
          isAccount(state.account);
        return valid
          ? { token: state.token as string, account: state.account as Account }
          : { token: null, account: null };
      },
      partialize: (state) => ({ token: state.token, account: state.account }),
    },
  ),
);

export const selectToken = (state: SessionState) => state.token;
export const selectAccount = (state: SessionState) => state.account;

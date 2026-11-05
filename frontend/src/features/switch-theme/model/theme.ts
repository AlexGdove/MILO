import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, storageKey } from '@/shared/lib';

/** Выбор пользователя: «Авто» — как в системе (prefers-color-scheme), иначе явно. */
export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_OPTIONS: ReadonlyArray<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: 'Авто' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
];

/** Ключ хранилища; его же читает скрипт в index.html до отрисовки (без вспышки темы). */
export const THEME_STORAGE_KEY = storageKey('theme');
export const THEME_STORAGE_VERSION = 1;

const isThemePreference = (value: unknown): value is ThemePreference =>
  value === 'system' || value === 'light' || value === 'dark';

/** Сохранённое значение → выбор; всё непонятное — «Авто». */
export const migrateTheme = (persisted: unknown): { theme: ThemePreference } => {
  const theme =
    typeof persisted === 'object' && persisted !== null
      ? (persisted as { theme?: unknown }).theme
      : undefined;
  return { theme: isThemePreference(theme) ? theme : 'system' };
};

interface ThemeState {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: THEME_STORAGE_KEY,
      storage: persistStorage,
      version: THEME_STORAGE_VERSION,
      migrate: migrateTheme,
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);

/**
 * Применяет выбор к документу: `data-theme` на <html> включает нужные токены
 * (app/styles/variables.css); «Авто» — атрибут убирается, решает prefers-color-scheme.
 */
export const applyTheme = (
  theme: ThemePreference,
  root: HTMLElement = document.documentElement,
) => {
  if (theme === 'system') delete root.dataset.theme;
  else root.dataset.theme = theme;
};

import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/** Префикс ключей хранилища приложения. */
export const STORAGE_PREFIX = 'milo:';

/** Префикс ключей до переименования приложения в MILO. Данные с ним переносятся при первом чтении. */
export const LEGACY_STORAGE_PREFIX = 'calorie-tracker:';

/**
 * Читает ключ; если его нет, но есть данные под старым префиксом —
 * переносит их в новый ключ и удаляет старый. Так пользователь не теряет данные после переименования.
 */
const readWithLegacyMigration = (name: string): string | null => {
  const current = localStorage.getItem(name);
  if (current !== null || !name.startsWith(STORAGE_PREFIX)) return current;

  const legacyName = LEGACY_STORAGE_PREFIX + name.slice(STORAGE_PREFIX.length);
  const legacy = localStorage.getItem(legacyName);
  if (legacy === null) return null;

  try {
    localStorage.setItem(name, legacy);
    localStorage.removeItem(legacyName);
  } catch {
    // запись не удалась (переполнение) — отдаём старые данные, старый ключ не трогаем
  }
  return legacy;
};

/**
 * Единая точка доступа к постоянному хранилищу.
 * Сейчас — localStorage; при появлении бэкенда меняется только этот модуль.
 */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return readWithLegacyMigration(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // хранилище недоступно (приватный режим / переполнение) — работаем в памяти
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // ignore
    }
  },
};

export const persistStorage = createJSONStorage(() => safeLocalStorage);

export const storageKey = (name: string) => `${STORAGE_PREFIX}${name}`;

import { createJSONStorage, type StateStorage } from 'zustand/middleware';

/**
 * Единая точка доступа к постоянному хранилищу.
 * Сейчас — localStorage; при появлении бэкенда меняется только этот модуль.
 */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
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

/** Префикс ключей хранилища приложения. */
export const storageKey = (name: string) => `calorie-tracker:${name}`;

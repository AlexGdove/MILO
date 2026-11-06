import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { ApiError, apiRequest } from '@/shared/api';
import { persistStorage, storageKey } from '@/shared/lib';

/**
 * Анонимный ключ устройства (ADR-0001, `docs/backend/api.md`): выдаётся сервером один раз,
 * хранится только здесь. Создаётся лениво — при первом обращении в поддержку или предложении
 * продукта; без него приложение работает как раньше, полностью локально.
 */
export const DEVICE_KEY_STORAGE_KEY = storageKey('device-key');
const DEVICE_KEY_PATTERN = /^mk_[A-Za-z0-9_-]{43}$/;

interface DeviceKeyState {
  key: string | null;
  setKey: (key: string | null) => void;
}

export const useDeviceKeyStore = create<DeviceKeyState>()(
  persist(
    (set) => ({
      key: null,
      setKey: (key) => set({ key }),
    }),
    {
      name: DEVICE_KEY_STORAGE_KEY,
      storage: persistStorage,
      version: 1,
      // Повреждённое или чужое значение — как будто ключа нет (сервер выдаст новый)
      migrate: (persisted) => {
        const key = (persisted as { key?: unknown } | null)?.key;
        return { key: typeof key === 'string' && DEVICE_KEY_PATTERN.test(key) ? key : null };
      },
      partialize: (state) => ({ key: state.key }),
    },
  ),
);

export const selectDeviceKey = (state: DeviceKeyState) => state.key;

/** Запрос нового ключа у сервера (лимит — 5 в час с IP). */
async function issueDeviceKey(): Promise<string> {
  const { key } = await apiRequest<{ key: string }>('/device-keys', { method: 'POST' });
  useDeviceKeyStore.getState().setKey(key);
  return key;
}

/** Ключ есть — его; нет — получить у сервера. */
export async function ensureDeviceKey(): Promise<string> {
  return useDeviceKeyStore.getState().key ?? issueDeviceKey();
}

/**
 * Выполняет запрос с ключом устройства. Сервер не знает ключ (удалён, база очищена) —
 * ключ получается заново и запрос повторяется один раз.
 */
export async function withDeviceKey<T>(request: (key: string) => Promise<T>): Promise<T> {
  const key = await ensureDeviceKey();
  try {
    return await request(key);
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== 'device_key_invalid') throw error;
    useDeviceKeyStore.getState().setKey(null);
    return request(await issueDeviceKey());
  }
}

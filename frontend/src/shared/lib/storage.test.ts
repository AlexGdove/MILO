import { describe, expect, it, vi } from 'vitest';

import { persistStorage, storageKey } from './storage';

const getStorage = () => {
  if (!persistStorage) throw new Error('persistStorage не создан');
  return persistStorage;
};

describe('storageKey', () => {
  it('добавляет префикс приложения', () => {
    expect(storageKey('products')).toBe('calorie-tracker:products');
  });
});

describe('persistStorage', () => {
  it('сохраняет состояние в localStorage как JSON и читает обратно', async () => {
    const storage = getStorage();
    await storage.setItem('test-key', { state: { value: 1 }, version: 2 });

    expect(JSON.parse(localStorage.getItem('test-key') ?? 'null')).toEqual({
      state: { value: 1 },
      version: 2,
    });
    expect(await storage.getItem('test-key')).toEqual({ state: { value: 1 }, version: 2 });
  });

  it('для отсутствующего ключа возвращает null', async () => {
    expect(await getStorage().getItem('missing')).toBeNull();
  });

  it('удаляет ключ', async () => {
    const storage = getStorage();
    await storage.setItem('test-key', { state: {}, version: 0 });
    await storage.removeItem('test-key');
    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('не падает, если localStorage недоступен (приватный режим)', async () => {
    const error = new DOMException('denied', 'SecurityError');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw error;
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw error;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw error;
    });
    const storage = getStorage();

    // createJSONStorage поверх синхронного хранилища возвращает значения синхронно;
    // await покрывает и асинхронный вариант на будущее.
    // Исключение внутри превратит промис в rejected, и проверка упадёт.
    await expect(
      Promise.resolve().then(() => storage.setItem('k', { state: {}, version: 0 })),
    ).resolves.toBeUndefined();
    expect(await storage.getItem('k')).toBeNull();
    await expect(Promise.resolve().then(() => storage.removeItem('k'))).resolves.toBeUndefined();
  });
});

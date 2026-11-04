import { describe, expect, it, vi } from 'vitest';

import { LEGACY_STORAGE_PREFIX, persistStorage, STORAGE_PREFIX, storageKey } from './storage';

const getStorage = () => {
  if (!persistStorage) throw new Error('persistStorage не создан');
  return persistStorage;
};

describe('storageKey', () => {
  it('добавляет префикс приложения', () => {
    expect(storageKey('products')).toBe('milo:products');
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

describe('миграция со старого префикса', () => {
  const raw = JSON.stringify({ state: { products: [{ id: 'p1' }] }, version: 0 });
  const raw2 = JSON.stringify({ state: { products: [{ id: 'p2' }] }, version: 1 });

  it('переносит данные со старого ключа и удаляет его', async () => {
    localStorage.setItem('calorie-tracker:products', raw);
    const item = await getStorage().getItem(storageKey('products'));
    expect(item).toEqual(JSON.parse(raw));
    expect(localStorage.getItem('milo:products')).toEqual(raw);
    expect(localStorage.getItem('calorie-tracker:products')).toBeNull();
  });

  it('новый ключ важнее старого', async () => {
    localStorage.setItem('milo:products', raw2);
    localStorage.setItem('calorie-tracker:products', raw);
    const item = await getStorage().getItem(storageKey('products'));
    expect(item).toEqual(JSON.parse(raw2));
    expect(localStorage.getItem('calorie-tracker:products')).toEqual(raw);
  });

  it('не мигрирует ключи без префикса MILO', async () => {
    localStorage.setItem('calorie-tracker:other', raw);
    const item = await getStorage().getItem('other');
    expect(item).toBeNull();
    expect(localStorage.getItem('calorie-tracker:other')).toEqual(raw);
  });

  it('возвращает null, если данных нет ни под каким ключом', async () => {
    const item = await getStorage().getItem(storageKey('products'));
    expect(item).toBeNull();
  });

  it('при ошибке записи возвращает старые данные и не удаляет их', async () => {
    localStorage.setItem('calorie-tracker:products', raw);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError');
    });
    const item = await getStorage().getItem(storageKey('products'));
    expect(item).toEqual(JSON.parse(raw));
    expect(localStorage.getItem('calorie-tracker:products')).toEqual(raw);
  });

  it('префиксы ключей', () => {
    expect(STORAGE_PREFIX).toBe('milo:');
    expect(LEGACY_STORAGE_PREFIX).toBe('calorie-tracker:');
  });
});

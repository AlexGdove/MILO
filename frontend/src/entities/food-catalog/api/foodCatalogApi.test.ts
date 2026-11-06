import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as sharedLib from '@/shared/lib';
import { isNativeApp } from '@/shared/lib';

import {
  catalogSearchAvailable,
  isBarcode,
  OFF_PRODUCT_URL,
  OFF_SEARCH_URL,
  searchCatalog,
} from './foodCatalogApi';

vi.mock('@/shared/lib', async (importOriginal) => ({
  ...(await importOriginal<typeof sharedLib>()),
  isNativeApp: vi.fn(() => false),
}));

const fetchMock = vi.fn<typeof fetch>();
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const call = () => {
  const [url, init] = fetchMock.mock.calls[0] as [URL | string, RequestInit];
  return { url: new URL(String(url), 'http://localhost'), init };
};

const RAW = {
  code: '4813494063866',
  product_name_ru: 'Гречка',
  brands: ['Ярмарка'],
  quantity: '900 г',
  nutriments: {
    'energy-kcal_100g': 340,
    proteins_100g: 13,
    fat_100g: 3.1,
    carbohydrates_100g: 66,
  },
};
const PARSED = {
  code: '4813494063866',
  name: 'Гречка',
  brand: 'Ярмарка',
  unit: 'g',
  per100g: { kcal: 340, protein: 13, fat: 3.1, carbs: 66 },
};

// Глобалы и env сбрасываются после каждого теста (unstubGlobals / unstubEnvs в vitest.config)
beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('VITE_API_URL', '/api/v1');
  vi.mocked(isNativeApp).mockReturnValue(false);
});

describe('isBarcode', () => {
  it('8–14 цифр — штрихкод, остальное — нет', () => {
    expect(isBarcode('4813494063866')).toBe(true);
    expect(isBarcode(' 12345678 ')).toBe(true);
    expect(isBarcode('1234567')).toBe(false);
    expect(isBarcode('гречка')).toBe(false);
    expect(isBarcode('123456789012345')).toBe(false);
  });
});

describe('catalogSearchAvailable', () => {
  it('штрихкод — всегда, даже без сервера', () => {
    vi.stubEnv('VITE_API_URL', '');
    expect(catalogSearchAvailable('4813494063866')).toBe(true);
  });

  it('название: короче 2 символов — нет; без сервера в браузере — нет; в приложении — да', () => {
    expect(catalogSearchAvailable('г')).toBe(false);
    expect(catalogSearchAvailable('гречка')).toBe(true);
    vi.stubEnv('VITE_API_URL', '');
    expect(catalogSearchAvailable('гречка')).toBe(false);
    vi.mocked(isNativeApp).mockReturnValue(true);
    expect(catalogSearchAvailable('гречка')).toBe(true);
  });
});

describe('searchCatalog', () => {
  it('штрихкод — напрямую в Open Food Facts, в браузере без своих заголовков', async () => {
    fetchMock.mockResolvedValue(json(200, { status: 1, product: RAW }));
    await expect(searchCatalog('4813494063866')).resolves.toEqual([PARSED]);
    const { url, init } = call();
    expect(`${url.origin}${url.pathname}`).toBe(`${OFF_PRODUCT_URL}/4813494063866.json`);
    expect(url.searchParams.get('fields')).toContain('nutriments');
    expect(init.headers).toEqual({});
  });

  it('штрихкода нет в базе (404 или status 0) — пустой список', async () => {
    fetchMock.mockResolvedValueOnce(json(404, { status: 0 }));
    await expect(searchCatalog('4813494063866')).resolves.toEqual([]);
    fetchMock.mockResolvedValueOnce(json(200, { status: 0 }));
    await expect(searchCatalog('4813494063866')).resolves.toEqual([]);
  });

  it('429 от Open Food Facts → catalog_busy', async () => {
    fetchMock.mockResolvedValue(json(429, {}));
    await expect(searchCatalog('4813494063866')).rejects.toMatchObject({ code: 'catalog_busy' });
  });

  it('в приложении название — напрямую, с User-Agent; товары без КБЖУ отброшены', async () => {
    vi.mocked(isNativeApp).mockReturnValue(true);
    fetchMock.mockResolvedValue(
      json(200, { hits: [RAW, { code: '4600000000001', product_name: 'Без КБЖУ' }] }),
    );
    await expect(searchCatalog('гречка')).resolves.toEqual([PARSED]);
    const { url, init } = call();
    expect(`${url.origin}${url.pathname}`).toBe(OFF_SEARCH_URL);
    expect(url.searchParams.get('q')).toBe('гречка');
    expect(url.searchParams.get('langs')).toBe('ru,en');
    expect(init.headers).toHaveProperty('User-Agent');
  });

  it('в браузере название — через сервер', async () => {
    fetchMock.mockResolvedValue(json(200, { items: [PARSED] }));
    await expect(searchCatalog(' гречка ')).resolves.toEqual([PARSED]);
    const { url } = call();
    expect(url.pathname).toBe('/api/v1/food-catalog/search');
    expect(url.searchParams.get('q')).toBe('гречка');
  });

  it('нет сети → catalog_unavailable', async () => {
    vi.mocked(isNativeApp).mockReturnValue(true);
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(searchCatalog('гречка')).rejects.toMatchObject({ code: 'catalog_unavailable' });
  });
});

import {
  ApiError,
  apiRequest,
  isAbort,
  isApiEnabled,
  REQUEST_TIMEOUT_MS,
  withTimeout,
} from '@/shared/api';
import { isNativeApp } from '@/shared/lib';

import { OFF_FIELDS, type OffProduct, parseOffProduct } from '../lib/parseOffProduct';
import type { CatalogFood } from '../model/types';

export const OFF_SEARCH_URL = 'https://search.openfoodfacts.org/search';
export const OFF_PRODUCT_URL = 'https://world.openfoodfacts.org/api/v2/product';
/** Open Food Facts просит представляться; браузер этот заголовок не шлёт — только приложение. */
const OFF_USER_AGENT = 'MILO/1.0 (https://github.com/AlexGdove/MILO)';
const PAGE_SIZE = 20;

/** Минимум символов для поиска по названию (как на сервере). */
export const CATALOG_MIN_QUERY = 2;
const MAX_QUERY = 60;

/** Строка из 8–14 цифр — штрихкод (EAN-8, EAN-13, UPC, GTIN-14). */
export const isBarcode = (query: string) => /^\d{8,14}$/.test(query.trim());

/**
 * Где искать (решение №53): штрихкод — везде напрямую (Open Food Facts пускает браузеры);
 * название — в приложении напрямую (нативные запросы, CORS не мешает), в браузере — через
 * наш сервер; сервера нет — поиск по названию недоступен.
 */
export const catalogSearchAvailable = (query: string): boolean => {
  const q = query.trim();
  if (isBarcode(q)) return true;
  if (q.length < CATALOG_MIN_QUERY || q.length > MAX_QUERY) return false;
  return isNativeApp() || isApiEnabled();
};

const parseAll = (items: OffProduct[]) =>
  items.map(parseOffProduct).filter((food): food is CatalogFood => food !== null);

async function offGet(url: URL, signal?: AbortSignal): Promise<Response> {
  // В браузере — без своих заголовков: иначе предварительный CORS-запрос, а его OFF не ждёт
  const headers: Record<string, string> = isNativeApp() ? { 'User-Agent': OFF_USER_AGENT } : {};
  // Тайм-аут — как у своего API: медленный Open Food Facts не держит поиск бесконечно
  const timeout = withTimeout(signal, REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { headers, signal: timeout.signal });
  } catch (error) {
    if (!timeout.timedOut() && isAbort(error)) throw error;
    throw new ApiError(0, 'catalog_unavailable', 'Open Food Facts is unreachable');
  } finally {
    timeout.done();
  }
  if (response.status === 429) {
    throw new ApiError(503, 'catalog_busy', 'Open Food Facts limit reached');
  }
  return response;
}

async function byBarcode(code: string, signal?: AbortSignal): Promise<CatalogFood[]> {
  const url = new URL(`${OFF_PRODUCT_URL}/${code}.json`);
  url.searchParams.set('fields', OFF_FIELDS);
  const response = await offGet(url, signal);
  // Товара нет — Open Food Facts отвечает 404 со status: 0
  if (response.status === 404) return [];
  if (!response.ok) throw new ApiError(503, 'catalog_unavailable', `HTTP ${response.status}`);
  const body = (await response.json()) as { status?: number; product?: OffProduct };
  return body.status === 1 && body.product ? parseAll([{ code, ...body.product }]) : [];
}

async function byNameDirect(query: string, signal?: AbortSignal): Promise<CatalogFood[]> {
  const url = new URL(OFF_SEARCH_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('page_size', String(PAGE_SIZE));
  url.searchParams.set('fields', OFF_FIELDS);
  url.searchParams.set('langs', 'ru,en');
  const response = await offGet(url, signal);
  if (!response.ok) throw new ApiError(503, 'catalog_unavailable', `HTTP ${response.status}`);
  return parseAll(((await response.json()) as { hits?: OffProduct[] }).hits ?? []);
}

export const foodCatalogKeys = {
  all: ['food-catalog'] as const,
  search: (query: string) => [...foodCatalogKeys.all, 'search', query] as const,
};

/** Поиск продуктов в Open Food Facts; ошибки — `ApiError` (`catalog_busy`, `catalog_unavailable`). */
export async function searchCatalog(query: string, signal?: AbortSignal): Promise<CatalogFood[]> {
  const q = query.trim();
  if (isBarcode(q)) return byBarcode(q, signal);
  if (isNativeApp()) return byNameDirect(q, signal);
  const page = await apiRequest<{ items: CatalogFood[] }>('/food-catalog/search', {
    query: { q },
    signal,
  });
  return page.items;
}

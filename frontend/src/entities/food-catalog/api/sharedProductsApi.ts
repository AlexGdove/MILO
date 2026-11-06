import { apiRequest, isApiEnabled } from '@/shared/api';

import { CATALOG_MIN_QUERY } from './foodCatalogApi';
import type { SharedProduct } from '../model/types';

const MAX_QUERY = 60;
const LIMIT = 20;

/** Общая база MILO (`GET /products`, B-18) — только когда сервер подключён. */
export const sharedSearchAvailable = (query: string): boolean => {
  const q = query.trim();
  return isApiEnabled() && q.length >= CATALOG_MIN_QUERY && q.length <= MAX_QUERY;
};

export const sharedProductKeys = {
  search: (query: string) => ['shared-products', 'search', query] as const,
};

/** Продукты общей базы, прошедшие модерацию: подстрока названия или бренда. */
export async function searchSharedProducts(
  query: string,
  signal?: AbortSignal,
): Promise<SharedProduct[]> {
  const page = await apiRequest<{ items: SharedProduct[] }>('/products', {
    query: { q: query.trim(), limit: LIMIT },
    signal,
  });
  return page.items;
}

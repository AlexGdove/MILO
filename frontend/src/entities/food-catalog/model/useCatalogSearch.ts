import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { catalogSearchAvailable, foodCatalogKeys, searchCatalog } from '../api/foodCatalogApi';
import {
  searchSharedProducts,
  sharedProductKeys,
  sharedSearchAvailable,
} from '../api/sharedProductsApi';

/** Пауза после ввода: Open Food Facts не любит запрос на каждую букву (лимит ~10 в минуту). */
export const CATALOG_DEBOUNCE_MS = 400;

/** Запрос после паузы ввода, без лишних пробелов. */
const useDebouncedQuery = (query: string) => {
  const value = query.trim().replace(/\s+/g, ' ');
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), CATALOG_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return debounced;
};

/** Общие настройки: без повторов (лимиты), кэш на 10 минут, без перезапроса при фокусе. */
const SEARCH_OPTIONS = { retry: false, staleTime: 10 * 60_000, refetchOnWindowFocus: false };

/**
 * Поиск в Open Food Facts по мере ввода: с паузой, старый запрос отменяется (signal), ответы
 * кэшируются на 10 минут. Без повторов при ошибке — лимит у Open Food Facts строгий.
 */
export function useCatalogSearch(query: string) {
  const q = useDebouncedQuery(query);
  const enabled = catalogSearchAvailable(q);
  const result = useQuery({
    queryKey: foodCatalogKeys.search(q.toLocaleLowerCase('ru-RU')),
    queryFn: ({ signal }) => searchCatalog(q, signal),
    enabled,
    ...SEARCH_OPTIONS,
  });
  return { ...result, enabled };
}

/** Поиск в общей базе MILO по мере ввода (решение №55); без сервера выключен. */
export function useSharedProductSearch(query: string) {
  const q = useDebouncedQuery(query);
  const enabled = sharedSearchAvailable(q);
  const result = useQuery({
    queryKey: sharedProductKeys.search(q.toLocaleLowerCase('ru-RU')),
    queryFn: ({ signal }) => searchSharedProducts(q, signal),
    enabled,
    ...SEARCH_OPTIONS,
  });
  return { ...result, enabled };
}

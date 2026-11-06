import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { catalogSearchAvailable, foodCatalogKeys, searchCatalog } from '../api/foodCatalogApi';

/** Пауза после ввода: Open Food Facts не любит запрос на каждую букву (лимит ~10 в минуту). */
export const CATALOG_DEBOUNCE_MS = 400;

const useDebounced = (value: string, delay: number) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

/**
 * Поиск в Open Food Facts по мере ввода: с паузой, старый запрос отменяется (signal), ответы
 * кэшируются на 10 минут. Без повторов при ошибке — лимит у Open Food Facts строгий.
 */
export function useCatalogSearch(query: string) {
  const q = useDebounced(query.trim().replace(/\s+/g, ' '), CATALOG_DEBOUNCE_MS);
  const enabled = catalogSearchAvailable(q);
  const result = useQuery({
    queryKey: foodCatalogKeys.search(q.toLocaleLowerCase('ru-RU')),
    queryFn: ({ signal }) => searchCatalog(q, signal),
    enabled,
    retry: false,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
  return { ...result, enabled };
}

import { useSharedProductSearch } from '@/entities/food-catalog';
import type { Product } from '@/entities/product';

const normalizeName = (name: string) => name.trim().toLocaleLowerCase('ru-RU');

/** Продукты общей базы, которых ещё нет у пользователя (то же название и единица). */
export function useSharedResults(query: string, own: readonly Product[]) {
  const { data, error } = useSharedProductSearch(query);
  if (error || !data) return [];
  const owned = new Set(own.map((product) => `${product.unit}:${normalizeName(product.name)}`));
  return data.filter((item) => !owned.has(`${item.unit}:${normalizeName(item.name)}`));
}

import { useSharedProductSearch } from '@/entities/food-catalog';
import type { Product } from '@/entities/product';

const normalizeName = (name: string) => name.trim().toLocaleLowerCase('ru-RU');

/** Продукты общей базы, которых ещё нет у пользователя (то же название и единица). */
export function useSharedResults(query: string, own: readonly Product[]) {
  const { data, error } = useSharedProductSearch(query);
  if (error || !data) return [];
  const owned = new Set(own.map((product) => `${product.unit}:${normalizeName(product.name)}`));
  const ownedCodes = new Set(own.map((product) => product.barcode).filter(Boolean));
  // Уже есть у пользователя: то же название и единица или тот же штрихкод
  return data.filter(
    (item) =>
      !owned.has(`${item.unit}:${normalizeName(item.name)}`) &&
      !(item.barcode !== null && ownedCodes.has(item.barcode)),
  );
}

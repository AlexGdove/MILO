import type { Product } from '@/entities/product';

export const filterProducts = (products: Product[], query: string): Product[] => {
  const normalized = query.trim().toLocaleLowerCase('ru-RU');
  if (!normalized) return products;
  return products.filter((product) => product.name.toLocaleLowerCase('ru-RU').includes(normalized));
};

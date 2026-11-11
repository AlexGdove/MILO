import { sameBarcode } from './barcode';
import type { Product } from '../model/types';

/**
 * Поиск по части названия или по штрихкоду: часть цифр или тот же код в другой записи
 * (UPC-A ↔ EAN-13 с ведущим нулём).
 */
export const filterProducts = (products: Product[], query: string): Product[] => {
  const normalized = query.trim().toLocaleLowerCase('ru-RU');
  if (!normalized) return products;
  return products.filter(
    (product) =>
      product.name.toLocaleLowerCase('ru-RU').includes(normalized) ||
      (product.barcode !== undefined &&
        (product.barcode.includes(normalized) || sameBarcode(product.barcode, normalized))),
  );
};

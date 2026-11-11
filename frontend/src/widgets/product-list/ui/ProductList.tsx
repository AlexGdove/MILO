import { useState } from 'react';

import {
  filterProducts,
  normalizeBarcode,
  ProductCard,
  selectProducts,
  useProductStore,
  type Product,
} from '@/entities/product';
import { AddToShoppingButton } from '@/features/add-to-shopping-list';
import { AddProductButton, EditProductButton } from '@/features/manage-product';
import { ProductSearch } from '@/features/search-products';
import { AddToPantryButton, SetStockButton } from '@/features/stock-product';
import { SuggestProduct, useSubmissionSync } from '@/features/suggest-product';
import { EmptyState } from '@/shared/ui';

import { CatalogResults } from './CatalogResults';
import styles from './ProductList.module.css';
import { SharedResultItem } from './SharedResults';
import { useSharedResults } from './useSharedResults';

const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, 'ru-RU');

/** В результатах поиска сначала то, что есть дома, затем остальное — по алфавиту. */
const byStockThenName = (a: Product, b: Product) =>
  Number(b.stock > 0) - Number(a.stock > 0) || byName(a, b);

/**
 * Кладовая: без запроса — только продукты в наличии.
 * Поиск идёт по всем известным продуктам: найденное можно положить в кладовую или в покупки.
 * Положили в кладовую или создали продукт из поиска — поиск сбрасывается, видна кладовая.
 * В том же списке после своих — продукты общей базы MILO, которых у пользователя нет (7c);
 * ниже отдельно — найденное в Open Food Facts (решение №53).
 */
export const ProductList = () => {
  const products = useProductStore(selectProducts);
  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';
  // Отсканировали (или ввели) штрихкод — «Создать продукт» кладёт его в поле штрихкода
  const scannedBarcode = normalizeBarcode(query);
  const resetSearch = () => setQuery('');
  // Решения модератора по своим предложениям — пока открыта кладовая
  useSubmissionSync();

  const visible = searching
    ? [...filterProducts(products, query)].sort(byStockThenName)
    : products.filter((product) => product.stock > 0).sort(byName);
  const shared = useSharedResults(searching ? query : '', products);
  const found = visible.length + shared.length;

  const renderEmpty = () =>
    searching ? (
      <EmptyState
        title="Ничего не найдено"
        description={
          scannedBarcode
            ? `Продукта со штрихкодом ${scannedBarcode} ещё нет — создайте его`
            : `Продукта «${query.trim()}» ещё нет — создайте его`
        }
        action={
          <AddProductButton
            {...(scannedBarcode ? { initialBarcode: scannedBarcode } : { initialName: query })}
            label="Создать продукт"
            onCreated={resetSearch}
          />
        }
      />
    ) : (
      <EmptyState
        title="Кладовая пуста"
        description="Найдите продукт через поиск и добавьте в кладовую или в покупки"
      />
    );

  return (
    <section className={styles.section}>
      <ProductSearch value={query} onChange={setQuery} />
      <p className={styles.caption} aria-live="polite">
        {searching ? `Найдено: ${found}` : `В наличии: ${visible.length}`}
      </p>
      {found === 0 ? (
        renderEmpty()
      ) : (
        <ul className={styles.list}>
          {visible.map((product) => (
            <li key={product.id}>
              <ProductCard
                product={product}
                stock={<SetStockButton product={product} />}
                actions={
                  <>
                    <AddToPantryButton product={product} onAdded={resetSearch} />
                    <AddToShoppingButton product={product} compact />
                    <EditProductButton
                      product={product}
                      extra={<SuggestProduct product={product} />}
                    />
                  </>
                }
              />
            </li>
          ))}
          {shared.map((item) => (
            <li key={`shared-${item.id}`}>
              <SharedResultItem item={item} onCreated={resetSearch} />
            </li>
          ))}
        </ul>
      )}
      {searching && <CatalogResults query={query} onCreated={resetSearch} />}
    </section>
  );
};

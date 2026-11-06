import { useState } from 'react';

import {
  filterProducts,
  ProductCard,
  selectProducts,
  useProductStore,
  type Product,
} from '@/entities/product';
import { AddToShoppingButton } from '@/features/add-to-shopping-list';
import { AddProductButton, EditProductButton } from '@/features/manage-product';
import { ProductSearch } from '@/features/search-products';
import { AddToPantryButton, SetStockButton } from '@/features/stock-product';
import { EmptyState } from '@/shared/ui';

import styles from './ProductList.module.css';

const byName = (a: Product, b: Product) => a.name.localeCompare(b.name, 'ru-RU');

/** В результатах поиска сначала то, что есть дома, затем остальное — по алфавиту. */
const byStockThenName = (a: Product, b: Product) =>
  Number(b.stock > 0) - Number(a.stock > 0) || byName(a, b);

/**
 * Кладовая: без запроса — только продукты в наличии.
 * Поиск идёт по всем известным продуктам: найденное можно положить в кладовую или в покупки.
 * Положили в кладовую или создали продукт из поиска — поиск сбрасывается, видна кладовая.
 */
export const ProductList = () => {
  const products = useProductStore(selectProducts);
  const [query, setQuery] = useState('');
  const searching = query.trim() !== '';
  const resetSearch = () => setQuery('');

  const visible = searching
    ? [...filterProducts(products, query)].sort(byStockThenName)
    : products.filter((product) => product.stock > 0).sort(byName);

  const renderEmpty = () =>
    searching ? (
      <EmptyState
        title="Ничего не найдено"
        description={`Продукта «${query.trim()}» ещё нет — создайте его`}
        action={
          <AddProductButton initialName={query} label="Создать продукт" onCreated={resetSearch} />
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
        {searching ? `Найдено: ${visible.length}` : `В наличии: ${visible.length}`}
      </p>
      {visible.length === 0 ? (
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
                    <EditProductButton product={product} />
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

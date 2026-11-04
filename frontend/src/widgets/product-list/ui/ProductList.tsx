import { useState } from 'react';

import { filterProducts, ProductCard, selectProducts, useProductStore } from '@/entities/product';
import { EditProductButton } from '@/features/manage-product';
import { ProductSearch } from '@/features/search-products';
import { cn } from '@/shared/lib';
import { EmptyState } from '@/shared/ui';

import styles from './ProductList.module.css';

type StockFilter = 'all' | 'inStock';

export const ProductList = () => {
  const products = useProductStore(selectProducts);
  const [query, setQuery] = useState('');
  const [stockFilter, setStockFilter] = useState<StockFilter>('all');

  const visible = filterProducts(products, query)
    .filter((product) => stockFilter === 'all' || product.stock > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'ru-RU'));

  return (
    <section className={styles.section}>
      <ProductSearch value={query} onChange={setQuery} />
      <div className={styles.tabs} role="tablist" aria-label="Фильтр продуктов">
        {(
          [
            ['all', `Все (${products.length})`],
            ['inStock', `В наличии (${products.filter((p) => p.stock > 0).length})`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={stockFilter === value}
            className={cn(styles.tab, stockFilter === value && styles.tabActive)}
            onClick={() => setStockFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <EmptyState
          title="Ничего не найдено"
          description={query ? 'Попробуйте изменить запрос' : 'Добавьте первый продукт'}
        />
      ) : (
        <ul className={styles.list}>
          {visible.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} actions={<EditProductButton product={product} />} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

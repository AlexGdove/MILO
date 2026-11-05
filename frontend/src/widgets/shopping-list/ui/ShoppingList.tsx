import { needsRestock, selectProducts, useProductStore } from '@/entities/product';
import {
  selectShoppingItems,
  ShoppingItemRow,
  useShoppingStore,
  type ShoppingItem,
} from '@/entities/shopping-item';
import { AddToShoppingButton } from '@/features/add-to-shopping-list';
import {
  getRestockIssue,
  RESTOCK_ISSUE_TEXT,
  RestockButton,
} from '@/features/restock-from-shopping';
import { formatAmount } from '@/shared/lib';
import { Button, EmptyState } from '@/shared/ui';

import styles from './ShoppingList.module.css';

export const ShoppingList = () => {
  const items = useShoppingStore(selectShoppingItems);
  const toggleItem = useShoppingStore((state) => state.toggleItem);
  const removeItem = useShoppingStore((state) => state.removeItem);
  const products = useProductStore(selectProducts);

  const productById = new Map(products.map((product) => [product.id, product]));
  const inList = new Set(items.map((item) => item.productId));
  const toBuy = items.filter((item) => !item.checked);
  const bought = items.filter((item) => item.checked);
  // Подсказки: отслеживаемые продукты ниже минимума, которых ещё нет в списке
  const suggestions = products
    .filter((product) => needsRestock(product) && !inList.has(product.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru-RU'));

  const renderItem = (item: ShoppingItem) => {
    const issue = getRestockIssue(item, productById.get(item.productId));
    return (
      <li key={item.id}>
        <ShoppingItemRow
          item={item}
          onToggle={() => toggleItem(item.id)}
          note={issue ? RESTOCK_ISSUE_TEXT[issue] : undefined}
          actions={
            <Button
              variant="ghost"
              size="small"
              onClick={() => removeItem(item.id)}
              aria-label={`Убрать ${item.name} из списка`}
            >
              ×
            </Button>
          }
        />
      </li>
    );
  };

  if (items.length === 0 && suggestions.length === 0) {
    return (
      <EmptyState
        title="Список покупок пуст"
        description="Добавляйте продукты из кладовой — купленное потом перенесёте в остатки одним нажатием"
      />
    );
  }

  return (
    <div className={styles.root}>
      {items.length === 0 ? (
        <EmptyState title="Список покупок пуст" description="Добавьте то, что заканчивается" />
      ) : (
        <>
          {toBuy.length > 0 && (
            <section className={styles.section} aria-labelledby="shopping-to-buy">
              <h2 id="shopping-to-buy" className={styles.heading}>
                Купить · {toBuy.length}
              </h2>
              <ul className={styles.list}>{toBuy.map(renderItem)}</ul>
            </section>
          )}
          {bought.length > 0 && (
            <section className={styles.section} aria-labelledby="shopping-bought">
              <h2 id="shopping-bought" className={styles.heading}>
                Куплено · {bought.length}
              </h2>
              <ul className={styles.list}>{bought.map(renderItem)}</ul>
            </section>
          )}
          <RestockButton />
        </>
      )}

      {suggestions.length > 0 && (
        <section className={styles.section} aria-labelledby="shopping-suggestions">
          <h2 id="shopping-suggestions" className={styles.heading}>
            Заканчиваются в кладовой
          </h2>
          <ul className={styles.list}>
            {suggestions.map((product) => (
              <li key={product.id} className={styles.suggestion}>
                <div className={styles.suggestionInfo}>
                  <span className={styles.suggestionName}>{product.name}</span>
                  <span className={styles.suggestionStock}>
                    {formatAmount(product.stock, product.unit)} из минимума{' '}
                    {formatAmount(product.minStock, product.unit)}
                  </span>
                </div>
                <AddToShoppingButton product={product} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

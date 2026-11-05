import { useEffect, useState } from 'react';

import {
  becameLow,
  getStockStatus,
  selectProducts,
  suggestPurchaseAmount,
  useProductStore,
} from '@/entities/product';
import { selectShoppingItems, useShoppingStore } from '@/entities/shopping-item';
import { Button, Toast } from '@/shared/ui';

/**
 * Предложение «мало» (решение №31): когда остаток продукта падает ниже минимума или до нуля
 * (съели, приготовили, поправили вручную) — предлагаем добавить в покупки. Само ничего не добавляется.
 */
export const LowStockPrompt = () => {
  const [queue, setQueue] = useState<string[]>([]);
  const products = useProductStore(selectProducts);
  const shopping = useShoppingStore(selectShoppingItems);
  const addItem = useShoppingStore((state) => state.addItem);

  useEffect(
    () =>
      useProductStore.subscribe((state, prev) => {
        const before = new Map(prev.products.map((product) => [product.id, product]));
        const low = state.products
          .filter((product) => {
            const old = before.get(product.id);
            return old !== undefined && becameLow(old, product);
          })
          .map((product) => product.id);
        if (low.length > 0) {
          setQueue((current) => [...current, ...low.filter((id) => !current.includes(id))]);
        }
      }),
    [],
  );

  // Показываем первое актуальное: продукт есть, всё ещё мало и его ещё нет в списке покупок
  const inList = new Set(shopping.map((item) => item.productId));
  const product = queue
    .map((id) => products.find((item) => item.id === id))
    .find((item) => item !== undefined && !inList.has(item.id) && getStockStatus(item) !== 'ok');

  if (!product) return null;

  const dismiss = () => setQueue((current) => current.filter((id) => id !== product.id));
  const status = getStockStatus(product);

  return (
    <Toast
      // Без согласования по роду: «Закончилось: Молоко», «Заканчивается: Гречка»
      message={`${status === 'out' ? 'Закончилось' : 'Заканчивается'}: ${product.name}`}
      onClose={dismiss}
      actions={
        <Button
          size="small"
          onClick={() => {
            addItem({
              productId: product.id,
              name: product.name,
              amount: suggestPurchaseAmount(product),
              unit: product.unit,
            });
            dismiss();
          }}
        >
          В покупки
        </Button>
      }
    />
  );
};

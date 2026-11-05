import { selectProducts, useProductStore } from '@/entities/product';
import { selectShoppingItems, useShoppingStore } from '@/entities/shopping-item';
import { Button } from '@/shared/ui';

import { planRestock } from '../lib/planRestock';

/** «Перенести купленное в кладовую»: остатки растут, перенесённые позиции уходят из списка. */
export const RestockButton = () => {
  const items = useShoppingStore(selectShoppingItems);
  const removeItems = useShoppingStore((state) => state.removeItems);
  const products = useProductStore(selectProducts);
  const adjustStock = useProductStore((state) => state.adjustStock);

  const plan = planRestock(items, products);
  const count = plan.restock.length;

  const handleRestock = () => {
    for (const { productId, amount } of plan.restock) {
      if (amount > 0) adjustStock(productId, amount);
    }
    removeItems(plan.restock.map(({ itemId }) => itemId));
  };

  return (
    <Button fullWidth disabled={count === 0} onClick={handleRestock}>
      {count > 0 ? `Перенести купленное в кладовую (${count})` : 'Отметьте купленное'}
    </Button>
  );
};

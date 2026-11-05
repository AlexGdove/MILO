import type { Product } from '@/entities/product';
import type { ShoppingItem } from '@/entities/shopping-item';

/** Почему позицию нельзя перенести в кладовую. */
export type RestockIssue = 'missing-product' | 'unit-changed';

export interface RestockPlan {
  /** Что прибавить к остаткам: по продукту, в его единицах */
  restock: Array<{ itemId: string; productId: string; amount: number }>;
  /** Отмеченные позиции, которые перенести нельзя, — остаются в списке */
  skipped: Array<{ itemId: string; issue: RestockIssue }>;
}

type ProductRef = Pick<Product, 'id' | 'unit'>;

export const getRestockIssue = (
  item: Pick<ShoppingItem, 'productId' | 'unit'>,
  product: ProductRef | undefined,
): RestockIssue | null => {
  if (!product) return 'missing-product';
  if (product.unit !== item.unit) return 'unit-changed';
  return null;
};

export const RESTOCK_ISSUE_TEXT: Record<RestockIssue, string> = {
  'missing-product': 'Продукт удалён из кладовой — перенести нельзя',
  'unit-changed': 'Единица продукта изменилась — добавьте позицию заново',
};

/**
 * План переноса купленного (отмеченного) в кладовую. Чистая функция: стор не трогает.
 * Неотмеченные позиции не участвуют.
 */
export const planRestock = (
  items: readonly ShoppingItem[],
  products: readonly ProductRef[],
): RestockPlan => {
  const byId = new Map(products.map((product) => [product.id, product]));
  const plan: RestockPlan = { restock: [], skipped: [] };

  for (const item of items) {
    if (!item.checked) continue;
    const issue = getRestockIssue(item, byId.get(item.productId));
    if (issue) {
      plan.skipped.push({ itemId: item.id, issue });
    } else {
      plan.restock.push({ itemId: item.id, productId: item.productId, amount: item.amount });
    }
  }

  return plan;
};

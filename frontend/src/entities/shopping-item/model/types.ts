import type { Unit } from '@/shared/lib';

/** Позиция списка покупок. Всегда ссылается на продукт кладовой — купленное переносится в его остаток. */
export interface ShoppingItem {
  id: string;
  productId: string;
  /** Название на момент добавления — чтобы позиция читалась, даже если продукт удалят */
  name: string;
  /** Сколько купить, в единицах продукта */
  amount: number;
  unit: Unit;
  /** Отмечено как купленное */
  checked: boolean;
  createdAt: number;
}

export type ShoppingItemDraft = Pick<ShoppingItem, 'productId' | 'name' | 'amount' | 'unit'>;

import { useCookedDishStore } from '@/entities/cooked-dish';
import { useMealEntryStore, type MealEntry } from '@/entities/meal-entry';
import { useProductStore } from '@/entities/product';

import styles from './RemoveMealEntryButton.module.css';

interface RemoveMealEntryButtonProps {
  entry: MealEntry;
}

/**
 * Удаляет запись и возвращает списанное: для продукта — на остаток в кладовой,
 * для приготовленного блюда — порции в «Приготовленные».
 */
export const RemoveMealEntryButton = ({ entry }: RemoveMealEntryButtonProps) => {
  const removeEntry = useMealEntryStore((state) => state.removeEntry);
  const adjustStock = useProductStore((state) => state.adjustStock);
  const returnPortions = useCookedDishStore((state) => state.returnPortions);

  const handleRemove = () => {
    const removed = removeEntry(entry.id);
    if (!removed || removed.stockDeducted <= 0) return;
    if (removed.source.type === 'product') adjustStock(removed.source.id, removed.stockDeducted);
    else returnPortions(removed.source.id, removed.stockDeducted);
  };

  return (
    <button
      type="button"
      className={styles.button}
      onClick={handleRemove}
      aria-label={`Удалить ${entry.productName}`}
    >
      ×
    </button>
  );
};

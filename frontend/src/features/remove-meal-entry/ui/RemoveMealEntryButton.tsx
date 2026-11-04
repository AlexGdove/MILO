import { useMealEntryStore, type MealEntry } from '@/entities/meal-entry';
import { useProductStore } from '@/entities/product';

import styles from './RemoveMealEntryButton.module.css';

interface RemoveMealEntryButtonProps {
  entry: MealEntry;
}

/** Удаляет запись и возвращает списанные граммы на остаток продукта. */
export const RemoveMealEntryButton = ({ entry }: RemoveMealEntryButtonProps) => {
  const removeEntry = useMealEntryStore((state) => state.removeEntry);
  const adjustStock = useProductStore((state) => state.adjustStock);

  const handleRemove = () => {
    const removed = removeEntry(entry.id);
    if (removed && removed.stockDeducted > 0) {
      adjustStock(removed.productId, removed.stockDeducted);
    }
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

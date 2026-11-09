import type { SharedProduct } from '@/entities/food-catalog';
import type { ProductDraft } from '@/entities/product';
import { FoundProductActions } from '@/features/add-found-product';
import { formatGrams, formatKcal } from '@/shared/lib';

import styles from './SharedResults.module.css';

const toDraft = (item: SharedProduct): ProductDraft => ({
  name: item.name,
  ...(item.barcode !== null && { barcode: item.barcode }),
  unit: item.unit,
  ...(item.pieceWeight !== null && { pieceWeight: item.pieceWeight }),
  per100g: item.per100g,
  stock: 0,
  minStock: 0,
});

interface SharedResultItemProps {
  item: SharedProduct;
  onCreated: () => void;
}

/**
 * Продукт общей базы MILO в общем списке поиска кладовой (без отдельного раздела): две
 * кнопки — в кладовую и в покупки (№64); продукт создаётся сразу с заполненным КБЖУ.
 */
export const SharedResultItem = ({ item, onCreated }: SharedResultItemProps) => {
  const { kcal, protein, fat, carbs } = item.per100g;
  return (
    <article className={styles.card}>
      <div className={styles.info}>
        <h3 className={styles.name}>{item.name}</h3>
        <p className={styles.macros}>
          {formatKcal(kcal)} ккал · Б {formatGrams(protein)} · Ж {formatGrams(fat)} · У{' '}
          {formatGrams(carbs)} / {item.unit === 'ml' ? '100 мл' : '100 г'}
        </p>
        <p className={styles.source}>
          {[item.brand, 'общая база MILO'].filter(Boolean).join(' · ')}
        </p>
      </div>
      <FoundProductActions draft={toDraft(item)} onAdded={onCreated} />
    </article>
  );
};

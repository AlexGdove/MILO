import type { ReactNode } from 'react';

import { formatGrams, formatKcal } from '@/shared/lib';

import styles from './MealEntryRow.module.css';
import { entryNutrients } from '../model/store';
import type { MealEntry } from '../model/types';

interface MealEntryRowProps {
  entry: MealEntry;
  actions?: ReactNode;
}

export const MealEntryRow = ({ entry, actions }: MealEntryRowProps) => {
  const nutrients = entryNutrients(entry);

  return (
    <div className={styles.row}>
      <div className={styles.info}>
        <p className={styles.name}>{entry.productName}</p>
        <p className={styles.details}>
          {formatGrams(entry.grams)} г · Б {formatGrams(nutrients.protein)} · Ж{' '}
          {formatGrams(nutrients.fat)} · У {formatGrams(nutrients.carbs)}
        </p>
      </div>
      <span className={styles.kcal}>{formatKcal(nutrients.kcal)} ккал</span>
      {actions}
    </div>
  );
};

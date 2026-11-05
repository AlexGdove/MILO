import type { ReactNode } from 'react';

import { formatGrams, formatKcal, nutrientsForGrams } from '@/shared/lib';

import styles from './CookedDishCard.module.css';
import type { CookedDish } from '../model/types';

const dateFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

interface CookedDishCardProps {
  dish: CookedDish;
  actions?: ReactNode;
}

export const CookedDishCard = ({ dish, actions }: CookedDishCardProps) => {
  const portion = nutrientsForGrams(dish.per100g, dish.portionGrams);

  return (
    <article className={styles.card}>
      <div className={styles.head}>
        <h3 className={styles.name}>{dish.name}</h3>
        <span className={styles.portions}>
          {dish.servingsLeft} из {dish.servingsTotal} порц.
        </span>
      </div>
      <p className={styles.meta}>
        Порция {formatGrams(dish.portionGrams)} г · {formatKcal(portion.kcal)} ккал · Б{' '}
        {formatGrams(portion.protein)} · Ж {formatGrams(portion.fat)} · У{' '}
        {formatGrams(portion.carbs)}
      </p>
      <p className={styles.date}>Приготовлено {dateFormatter.format(dish.cookedAt)}</p>
      {actions && <div className={styles.actions}>{actions}</div>}
    </article>
  );
};

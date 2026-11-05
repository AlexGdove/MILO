import type { ReactNode } from 'react';

import { cn, formatAmount, formatGrams, formatKcal } from '@/shared/lib';

import styles from './ProductCard.module.css';
import { getStockStatus, needsRestock } from '../lib/stockStatus';
import type { Product } from '../model/types';

interface ProductCardProps {
  product: Product;
  /** Слот для действий (кнопки фич) */
  actions?: ReactNode;
}

export const ProductCard = ({ product, actions }: ProductCardProps) => {
  const { kcal, protein, fat, carbs } = product.per100g;
  const status = getStockStatus(product);

  return (
    <article className={styles.card}>
      <div className={styles.info}>
        <div className={styles.titleRow}>
          <h3 className={styles.name}>{product.name}</h3>
          {needsRestock(product) && (
            <span
              className={cn(styles.badge, status === 'out' ? styles.badgeOut : styles.badgeLow)}
            >
              {status === 'out' ? 'Закончился' : 'Заканчивается'}
            </span>
          )}
        </div>
        <p className={styles.macros}>
          <span className={styles.kcal}>{formatKcal(kcal)} ккал</span> · Б {formatGrams(protein)} ·
          Ж {formatGrams(fat)} · У {formatGrams(carbs)}{' '}
          <span className={styles.per}>/ {product.unit === 'ml' ? '100 мл' : '100 г'}</span>
        </p>
        <p className={cn(styles.stock, status === 'out' && styles.stockEmpty)}>
          {status === 'out'
            ? 'Нет в наличии'
            : `В наличии: ${formatAmount(product.stock, product.unit)}`}
        </p>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </article>
  );
};

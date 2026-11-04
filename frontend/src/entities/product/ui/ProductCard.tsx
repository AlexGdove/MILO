import type { ReactNode } from 'react';

import { formatGrams, formatKcal } from '@/shared/lib';

import styles from './ProductCard.module.css';
import type { Product } from '../model/types';

interface ProductCardProps {
  product: Product;
  /** Слот для действий (кнопки фич) */
  actions?: ReactNode;
}

export const ProductCard = ({ product, actions }: ProductCardProps) => {
  const { kcal, protein, fat, carbs } = product.per100g;

  return (
    <article className={styles.card}>
      <div className={styles.info}>
        <h3 className={styles.name}>{product.name}</h3>
        <p className={styles.macros}>
          <span className={styles.kcal}>{formatKcal(kcal)} ккал</span> · Б {formatGrams(protein)} ·
          Ж {formatGrams(fat)} · У {formatGrams(carbs)} <span className={styles.per}>/ 100 г</span>
        </p>
        <p className={product.stock > 0 ? styles.stock : styles.stockEmpty}>
          {product.stock > 0 ? `В наличии: ${formatGrams(product.stock)} г` : 'Нет в наличии'}
        </p>
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </article>
  );
};

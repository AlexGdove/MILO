import { useId, type ReactNode } from 'react';

import { cn, formatAmount } from '@/shared/lib';

import styles from './ShoppingItemRow.module.css';
import type { ShoppingItem } from '../model/types';

interface ShoppingItemRowProps {
  item: ShoppingItem;
  onToggle: () => void;
  /** Пояснение под названием (например, «продукт удалён из кладовой») */
  note?: string;
  /** Слот для действий (кнопки фич) */
  actions?: ReactNode;
}

export const ShoppingItemRow = ({ item, onToggle, note, actions }: ShoppingItemRowProps) => {
  const checkboxId = useId();

  return (
    <article className={cn(styles.row, item.checked && styles.checked)}>
      <input
        id={checkboxId}
        type="checkbox"
        className={styles.checkbox}
        checked={item.checked}
        onChange={onToggle}
      />
      <label className={styles.info} htmlFor={checkboxId}>
        <span className={styles.name}>{item.name}</span>
        <span className={styles.amount}>{formatAmount(item.amount, item.unit)}</span>
        {note && <span className={styles.note}>{note}</span>}
      </label>
      {actions && <div className={styles.actions}>{actions}</div>}
    </article>
  );
};

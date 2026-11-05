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
      {/* Свой вид галочки (решение №32): настоящий чекбокс прозрачный поверх круга — для доступности */}
      <span className={styles.box}>
        <input
          id={checkboxId}
          type="checkbox"
          className={styles.input}
          checked={item.checked}
          onChange={onToggle}
        />
        <svg
          className={styles.mark}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
      </span>
      <label className={styles.info} htmlFor={checkboxId}>
        <span className={styles.name}>{item.name}</span>
        <span className={styles.amount}>{formatAmount(item.amount, item.unit)}</span>
        {note && <span className={styles.note}>{note}</span>}
      </label>
      {actions && <div className={styles.actions}>{actions}</div>}
    </article>
  );
};

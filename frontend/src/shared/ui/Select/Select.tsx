import type { SelectHTMLAttributes } from 'react';

import { cn } from '@/shared/lib';

import styles from './Select.module.css';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Класс обёртки (ширина, flex) — сам список растягивается на неё */
  className?: string;
}

/**
 * Выпадающий список со своей стрелкой (решение №54): стрелку браузера каждый рисует
 * по-своему и у самого края, поэтому она скрыта (`appearance: none`) и заменена значком.
 */
export const Select = ({ className, children, ...props }: SelectProps) => (
  <div className={cn(styles.root, className)}>
    <select className={styles.select} {...props}>
      {children}
    </select>
    <svg
      className={styles.arrow}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  </div>
);

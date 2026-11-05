import { cn } from '@/shared/lib';

import styles from './Tabs.module.css';

interface TabItem<T extends string> {
  value: T;
  label: string;
}

interface TabsProps<T extends string> {
  /** Доступное имя группы вкладок */
  label: string;
  items: ReadonlyArray<TabItem<T>>;
  value: T;
  onChange: (value: T) => void;
}

/** Вкладки-«таблетки» раздела; ширина каждой — по подписи, чтобы на 360 px ничего не обрезалось. */
export const Tabs = <T extends string>({ label, items, value, onChange }: TabsProps<T>) => (
  <div className={styles.tabs} role="tablist" aria-label={label}>
    {items.map((item) => (
      <button
        key={item.value}
        type="button"
        role="tab"
        aria-selected={value === item.value}
        className={cn(styles.tab, value === item.value && styles.active)}
        onClick={() => onChange(item.value)}
      >
        {item.label}
      </button>
    ))}
  </div>
);

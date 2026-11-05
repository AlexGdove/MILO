import type { ReactNode } from 'react';

import { cn } from '@/shared/lib';

import styles from './Collapsible.module.css';

interface CollapsibleProps {
  title: string;
  /** Краткое содержимое в заголовке, видно и в свёрнутом виде */
  summary?: ReactNode;
  /** Открыт ли при первом показе */
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}

/** Сворачиваемый блок (аккордеон) на нативных <details>/<summary>: доступен с клавиатуры и скринридеру. */
export const Collapsible = ({
  title,
  summary,
  defaultOpen = false,
  className,
  children,
}: CollapsibleProps) => (
  <details className={cn(styles.details, className)} open={defaultOpen}>
    <summary className={styles.summary}>
      <div className={styles.heading}>
        {/* Заголовок внутри summary допустим и сохраняет структуру страницы для скринридеров */}
        <h2 className={styles.title}>{title}</h2>
        {summary && <span className={styles.brief}>{summary}</span>}
      </div>
      <svg
        className={styles.chevron}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </summary>
    <div className={styles.body}>{children}</div>
  </details>
);

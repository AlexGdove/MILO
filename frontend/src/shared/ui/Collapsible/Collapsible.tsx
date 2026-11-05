import type { ReactNode } from 'react';

import { cn } from '@/shared/lib';

import styles from './Collapsible.module.css';
import { useCollapseAnimation } from './useCollapseAnimation';

interface CollapsibleProps {
  title: string;
  /** Краткое содержимое в заголовке, видно и в свёрнутом виде */
  summary?: ReactNode;
  /** Открыт ли при первом показе */
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Сворачиваемый блок (аккордеон) на нативных <details>/<summary>: доступен с клавиатуры и скринридеру.
 * Раскрытие и сворачивание — плавные (useCollapseAnimation).
 */
export const Collapsible = ({
  title,
  summary,
  defaultOpen = false,
  className,
  children,
}: CollapsibleProps) => {
  const { open, expanded, detailsRef, bodyRef, onSummaryClick, onToggle } =
    useCollapseAnimation(defaultOpen);

  return (
    <details
      ref={detailsRef}
      className={cn(styles.details, expanded && styles.expanded, className)}
      open={open}
      onToggle={onToggle}
    >
      <summary className={styles.summary} onClick={onSummaryClick}>
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
      {/* Анимируется высота внешнего блока; отступы — во внутреннем, чтобы при высоте 0 не оставалась полоска */}
      <div ref={bodyRef} className={styles.body}>
        <div className={styles.bodyInner}>{children}</div>
      </div>
    </details>
  );
};

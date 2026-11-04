import type { ReactNode } from 'react';

import styles from './EmptyState.module.css';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState = ({ title, description, action }: EmptyStateProps) => (
  <div className={styles.empty}>
    <p className={styles.title}>{title}</p>
    {description && <p>{description}</p>}
    {action && <div className={styles.action}>{action}</div>}
  </div>
);

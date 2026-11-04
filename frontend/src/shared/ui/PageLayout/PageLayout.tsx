import type { ReactNode } from 'react';

import styles from './PageLayout.module.css';

interface PageLayoutProps {
  title: string;
  /** Необязательный элемент над заголовком (например, логотип) */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export const PageLayout = ({ title, eyebrow, actions, children }: PageLayoutProps) => (
  <main className={styles.page}>
    {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      {actions}
    </header>
    {children}
  </main>
);

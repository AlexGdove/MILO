import type { ReactNode } from 'react';

import styles from './PageLayout.module.css';

interface PageLayoutProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
}

export const PageLayout = ({ title, actions, children }: PageLayoutProps) => (
  <main className={styles.page}>
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      {actions}
    </header>
    {children}
  </main>
);

import type { ReactNode } from 'react';

import styles from './PageLayout.module.css';

interface PageLayoutProps {
  title: string;
  /** Необязательный ряд над заголовком (логотип, ссылка на профиль); элементы — по краям */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}

export const PageLayout = ({ title, eyebrow, actions, children }: PageLayoutProps) => (
  <main className={styles.page}>
    {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
    {children}
  </main>
);

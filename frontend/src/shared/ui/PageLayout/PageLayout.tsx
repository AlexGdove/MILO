import type { ReactNode } from 'react';

import { cn } from '@/shared/lib';

import styles from './PageLayout.module.css';

interface PageLayoutProps {
  title: string;
  /** Необязательный ряд над заголовком (логотип, ссылка на профиль); элементы — по краям */
  eyebrow?: ReactNode;
  actions?: ReactNode;
  /** Заголовок только для экранного диктора (на «Сегодня» его место занимает календарь недели) */
  hideTitle?: boolean;
  children: ReactNode;
}

export const PageLayout = ({ title, eyebrow, actions, hideTitle, children }: PageLayoutProps) => (
  <main className={styles.page}>
    {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
    <header className={cn(styles.header, hideTitle && styles.visuallyHidden)}>
      <h1 className={styles.title}>{title}</h1>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
    {children}
  </main>
);

import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';

import { APP_VERSION, ROUTES } from '@/shared/config';
import { MiloMark } from '@/shared/ui';

import styles from './Legal.module.css';

const DOCUMENTS = [
  { to: ROUTES.tariffs, label: 'Тарифы' },
  { to: ROUTES.offer, label: 'Оферта' },
  { to: ROUTES.privacy, label: 'Политика конфиденциальности' },
  { to: ROUTES.requisites, label: 'Реквизиты и контакты' },
] as const;

interface LegalLayoutProps {
  title: string;
  /** Дата редакции документа, например «17 ноября 2026 г.» */
  updated?: string;
  children: ReactNode;
}

/**
 * Страница документа (решение №77): открывается по прямой ссылке без анкеты и нижней навигации,
 * внизу — ссылки на все документы. Ссылка «MILO» ведёт в приложение.
 */
export const LegalLayout = ({ title, updated, children }: LegalLayoutProps) => (
  <main className={styles.page}>
    <Link to={ROUTES.dashboard} className={styles.home}>
      <MiloMark size={28} title="" />
      MILO
    </Link>
    <article className={styles.article}>
      <h1 className={styles.title}>{title}</h1>
      {updated && <p className={styles.updated}>Редакция от {updated}</p>}
      {children}
    </article>
    <footer className={styles.footer}>
      <nav aria-label="Документы">
        <ul className={styles.documents}>
          {DOCUMENTS.map((document) => (
            <li key={document.to}>
              <NavLink to={document.to} className={styles.documentLink}>
                {document.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <p className={styles.version}>MILO {APP_VERSION}</p>
    </footer>
  </main>
);

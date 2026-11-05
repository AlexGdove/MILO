import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config';

import styles from './AppLink.module.css';

/** Кнопка в шапке страниц: переход на страницу «Приложение» (установка и скачивание, решение №28). */
export const AppLink = () => (
  <Link to={ROUTES.app} className={styles.link} aria-label="Приложение">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <rect x="6" y="2.5" width="12" height="19" rx="3" />
      <path d="M12 7.5v6M9.5 11l2.5 2.5 2.5-2.5" />
      <path d="M10.5 18.5h3" />
    </svg>
  </Link>
);

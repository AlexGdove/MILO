import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config';

import styles from './ProfileLink.module.css';

/** Профиль открывается из шапки страницы (в нижней навигации его нет). */
export const ProfileLink = () => (
  <Link to={ROUTES.profile} className={styles.link} aria-label="Профиль">
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  </Link>
);

import { Link } from 'react-router-dom';

import styles from './BackLink.module.css';

interface BackLinkProps {
  to: string;
  /** Куда ведёт: «Профиль», «Настройки», … — показывается как «← Профиль» */
  label: string;
}

/** Ссылка «назад» над заголовком вложенной страницы (`PageLayout.eyebrow`). */
export const BackLink = ({ to, label }: BackLinkProps) => (
  <Link to={to} className={styles.back}>
    ← {label}
  </Link>
);

import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config';
import { paidFeaturesAvailable } from '@/shared/lib';

import styles from './LegalLinks.module.css';

/**
 * Ссылки на документы (решение №77) — на экране приветствия и в «Настройках».
 * «Тарифы» скрыты там, где платного нет (приложение из App Store, №76 п. 6).
 */
export const LegalLinks = () => {
  const links = [
    ...(paidFeaturesAvailable() ? [{ to: ROUTES.tariffs, label: 'Тарифы' }] : []),
    { to: ROUTES.offer, label: 'Оферта' },
    { to: ROUTES.privacy, label: 'Политика конфиденциальности' },
    { to: ROUTES.requisites, label: 'Реквизиты и контакты' },
  ];

  return (
    <nav aria-label="Документы">
      <ul className={styles.links}>
        {links.map((link) => (
          <li key={link.to}>
            <Link to={link.to} className={styles.link}>
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

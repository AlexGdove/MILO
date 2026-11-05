import { Link } from 'react-router-dom';

import { ROUTES } from '@/shared/config';
import { MiloMark } from '@/shared/ui';

import styles from './AppHeader.module.css';
import { AppLink } from './AppLink';
import { KcalCounter } from './KcalCounter';

/** Шапка на каждой странице (решение №29): логотип, счётчик ккал за сегодня, переход к приложению. */
export const AppHeader = () => (
  <header className={styles.header}>
    <Link to={ROUTES.dashboard} className={styles.logo} aria-label="MILO — на главную">
      <MiloMark size={28} />
      <span className={styles.wordmark} aria-hidden="true">
        MILO
      </span>
    </Link>
    <KcalCounter />
    <AppLink />
  </header>
);

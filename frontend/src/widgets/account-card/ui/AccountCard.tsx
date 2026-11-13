import { Link } from 'react-router-dom';

import { PLAN_LABEL, selectAccount, selectToken, useSessionStore } from '@/entities/account';
import { accountPath } from '@/shared/config';
import { Card } from '@/shared/ui';

import styles from './AccountCard.module.css';

/** Аккаунт на «Профиле» (задача 9.2a): не вошли — вход и регистрация; вошли — почта и тариф. */
export const AccountCard = () => {
  const token = useSessionStore(selectToken);
  const account = useSessionStore(selectAccount);

  if (!token || !account) {
    return (
      <Card className={styles.promo}>
        <h2 className={styles.title}>Аккаунт MILO</h2>
        <p className={styles.hint}>
          Войдите, чтобы пользоваться тарифом. Дневник, кладовая и рецепты остаются на этом
          устройстве.
        </p>
        <div className={styles.actions}>
          <Link to={accountPath({ from: 'profile' })} className={styles.primary}>
            Войти
          </Link>
          <Link
            to={accountPath({ step: 'register', from: 'profile' })}
            className={styles.secondary}
          >
            Создать аккаунт
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className={styles.section}>
      <h2 className={styles.title}>{account.email}</h2>
      <p className={styles.plan}>
        Тариф: <strong>{PLAN_LABEL[account.plan]}</strong>
      </p>
      <Link to={accountPath({ from: 'profile' })} className={styles.manage}>
        Управление аккаунтом →
      </Link>
    </Card>
  );
};

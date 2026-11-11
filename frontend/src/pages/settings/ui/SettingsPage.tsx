import { Link } from 'react-router-dom';

import { selectAccount, useSessionStore } from '@/entities/account';
import { ErrorReportsToggle } from '@/features/report-errors';
import { LanguageSwitcher } from '@/features/switch-language';
import { ThemeSwitcher } from '@/features/switch-theme';
import { APP_VERSION, ROUTES } from '@/shared/config';
import { BackLink, Card, PageLayout, PrivacyNotice } from '@/shared/ui';

import styles from './SettingsPage.module.css';

/** Аккаунт (решение №69): почта, если вошли; иначе — вход и регистрация. */
const AccountCard = () => {
  const account = useSessionStore(selectAccount);
  return (
    <Card className={styles.section}>
      <h2 className={styles.title}>Аккаунт</h2>
      <p className={styles.hint}>
        {account
          ? `Вы вошли как ${account.email}`
          : 'Нужен только для тарифа — данные остаются на этом устройстве.'}
      </p>
      <Link to={ROUTES.account} className={styles.link}>
        {account ? 'Управление аккаунтом' : 'Войти или зарегистрироваться'}
      </Link>
    </Card>
  );
};

/** Настройки (решение №43): открываются шестерёнкой в «Профиле». */
export const SettingsPage = () => (
  <PageLayout title="Настройки" eyebrow={<BackLink to={ROUTES.profile} label="Профиль" />}>
    <AccountCard />
    <Card className={styles.section}>
      <h2 className={styles.title}>Оформление</h2>
      <ThemeSwitcher />
    </Card>
    <Card className={styles.section}>
      <h2 className={styles.title}>Язык</h2>
      <LanguageSwitcher />
    </Card>
    <Card className={styles.section}>
      <h2 className={styles.title}>Отчёты об ошибках</h2>
      <ErrorReportsToggle />
    </Card>
    <Card className={styles.section}>
      <h2 className={styles.title}>Данные и конфиденциальность</h2>
      <PrivacyNotice variant="full" />
    </Card>
    <Card className={styles.section}>
      <h2 className={styles.title}>Техподдержка</h2>
      <p className={styles.hint}>
        Вопрос, ошибка или идея — напишите нам, ответ придёт в приложение.
      </p>
      <Link to={ROUTES.support} className={styles.link}>
        Написать в поддержку
      </Link>
    </Card>
    <p className={styles.version}>MILO {APP_VERSION}</p>
  </PageLayout>
);

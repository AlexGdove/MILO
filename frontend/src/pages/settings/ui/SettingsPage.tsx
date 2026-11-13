import { Link } from 'react-router-dom';

import { selectAccount, selectToken, useSessionStore } from '@/entities/account';
import { ChangePassword, DeleteAccount } from '@/features/auth';
import { ErrorReportsToggle } from '@/features/report-errors';
import { LanguageSwitcher } from '@/features/switch-language';
import { ThemeSwitcher } from '@/features/switch-theme';
import { APP_VERSION, ROUTES } from '@/shared/config';
import { BackLink, Card, PageLayout, PrivacyNotice } from '@/shared/ui';

import styles from './SettingsPage.module.css';

/**
 * Аккаунт (просьба владельца 2026-11-13): только для вошедшего — смена пароля и удаление.
 * Вход и регистрация — на «Профиле» (задача 9.2a), здесь их нет.
 */
const AccountCard = () => {
  const token = useSessionStore(selectToken);
  const account = useSessionStore(selectAccount);
  if (!token || !account) return null;

  return (
    <Card className={styles.section}>
      <h2 className={styles.title}>Аккаунт</h2>
      <p className={styles.hint}>Вы вошли как {account.email}</p>
      <ChangePassword email={account.email} />
      <DeleteAccount token={token} />
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

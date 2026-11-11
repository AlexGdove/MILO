import { useEffect, useState } from 'react';

import {
  accountApi,
  selectAccount,
  selectToken,
  useSessionStore,
  type Plan,
} from '@/entities/account';
import {
  authErrorText,
  CodeForm,
  ForgotPasswordForm,
  LoginForm,
  RegisterForm,
  ResetPasswordForm,
} from '@/features/auth';
import { ApiError } from '@/shared/api';
import { ROUTES } from '@/shared/config';
import { BackLink, Button, Card, Modal, PageLayout } from '@/shared/ui';

import styles from './AccountPage.module.css';

type Step = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

const PLAN_LABEL: Record<Plan, string> = {
  free: 'Бесплатный',
  plus: 'Plus',
  unlimited: 'Безлимитный',
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Аккаунт (решение №69): регистрация с подтверждением почты кодом, вход паролем, сброс пароля
 * кодом. Аккаунт необязателен — нужен только для тарифа; данные остаются на устройстве.
 */
export const AccountPage = () => {
  const token = useSessionStore(selectToken);
  const account = useSessionStore(selectAccount);

  return (
    <PageLayout title="Аккаунт" eyebrow={<BackLink to={ROUTES.settings} label="Настройки" />}>
      {token && account ? <SignedIn token={token} /> : <SignInFlow />}
    </PageLayout>
  );
};

/** Вход, регистрация, подтверждение почты и сброс пароля — шаги на одной странице. */
const SignInFlow = () => {
  const signIn = useSessionStore((state) => state.signIn);
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');

  const go = (next: Step, nextEmail = email) => {
    setEmail(nextEmail);
    setStep(next);
  };
  const resend = async () => {
    await accountApi.resendCode(email);
  };

  if (step === 'register') {
    return (
      <Card className={styles.section}>
        <h2 className={styles.title}>Регистрация</h2>
        <p className={styles.hint}>
          Аккаунт нужен только для тарифа. Дневник, кладовая и рецепты остаются на этом устройстве.
        </p>
        <RegisterForm
          onSubmit={async (values) => {
            await accountApi.register(values.email, values.password);
            go('verify', values.email);
          }}
        />
        <Button variant="ghost" onClick={() => go('login')}>
          Уже есть аккаунт? Войти
        </Button>
      </Card>
    );
  }

  if (step === 'verify') {
    return (
      <Card className={styles.section}>
        <h2 className={styles.title}>Подтвердите почту</h2>
        <CodeForm
          email={email}
          onSubmit={async (code) => signIn(await accountApi.verifyEmail(email, code))}
          onResend={resend}
        />
        <Button variant="ghost" onClick={() => go('login')}>
          Назад ко входу
        </Button>
      </Card>
    );
  }

  if (step === 'forgot') {
    return (
      <Card className={styles.section}>
        <h2 className={styles.title}>Восстановление пароля</h2>
        <ForgotPasswordForm
          defaultEmail={email}
          onSubmit={async (values) => {
            await accountApi.forgotPassword(values.email);
            go('reset', values.email);
          }}
        />
        <Button variant="ghost" onClick={() => go('login')}>
          Назад ко входу
        </Button>
      </Card>
    );
  }

  if (step === 'reset') {
    return (
      <Card className={styles.section}>
        <h2 className={styles.title}>Новый пароль</h2>
        <ResetPasswordForm
          email={email}
          onSubmit={async (values) =>
            signIn(await accountApi.resetPassword(email, values.code, values.password))
          }
          onResend={async () => {
            await accountApi.forgotPassword(email);
          }}
        />
        <Button variant="ghost" onClick={() => go('login')}>
          Назад ко входу
        </Button>
      </Card>
    );
  }

  return (
    <Card className={styles.section}>
      <h2 className={styles.title}>Вход</h2>
      <LoginForm
        defaultEmail={email}
        onSubmit={async (values) => {
          try {
            signIn(await accountApi.login(values.email, values.password));
          } catch (error) {
            // Почта не подтверждена (пароль верный) — новый код и шаг подтверждения
            if (error instanceof ApiError && error.code === 'email_not_verified') {
              await accountApi.resendCode(values.email);
              go('verify', values.email);
              return;
            }
            throw error;
          }
        }}
      />
      <Button variant="ghost" onClick={() => go('forgot')}>
        Забыли пароль?
      </Button>
      <Button variant="secondary" onClick={() => go('register')}>
        Создать аккаунт
      </Button>
    </Card>
  );
};

/** Вошли: почта, тариф, выход и удаление аккаунта. */
const SignedIn = ({ token }: { token: string }) => {
  const account = useSessionStore(selectAccount);
  const setAccount = useSessionStore((state) => state.setAccount);
  const signOut = useSessionStore((state) => state.signOut);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  // Свежий тариф с сервера; сессия больше не действует — выйти локально
  useEffect(() => {
    let cancelled = false;
    accountApi.me(token).then(
      (fresh) => {
        if (!cancelled) setAccount(fresh);
      },
      (failure: unknown) => {
        if (!cancelled && failure instanceof ApiError && failure.status === 401) signOut();
      },
    );
    return () => {
      cancelled = true;
    };
  }, [token, setAccount, signOut]);

  if (!account) return null;

  const logout = async () => {
    setPending(true);
    // Сервер недоступен — всё равно выходим на устройстве; сессия истечёт сама
    await accountApi.logout(token).catch(() => undefined);
    signOut();
  };

  const remove = async () => {
    setPending(true);
    setError(null);
    try {
      await accountApi.remove(token);
      signOut();
    } catch (failure) {
      setError(failure);
      setPending(false);
    }
  };

  return (
    <Card className={styles.section}>
      <h2 className={styles.title}>{account.email}</h2>
      <p className={styles.plan}>
        Тариф: <strong>{PLAN_LABEL[account.plan]}</strong>
        {account.planUntil && ` до ${formatDate(account.planUntil)}`}
      </p>
      <Button variant="secondary" disabled={pending} onClick={() => void logout()}>
        Выйти
      </Button>
      <Button variant="ghost" disabled={pending} onClick={() => setConfirmDelete(true)}>
        Удалить аккаунт
      </Button>
      <Modal open={confirmDelete} title="Удалить аккаунт?" onClose={() => setConfirmDelete(false)}>
        <div className={styles.section}>
          <p className={styles.hint}>
            Аккаунт и оплаченный тариф будут удалены без возможности восстановления. Данные на этом
            устройстве останутся.
          </p>
          {error !== null && (
            <p role="alert" className={styles.error}>
              {authErrorText(error)}
            </p>
          )}
          <Button variant="danger" disabled={pending} onClick={() => void remove()}>
            Удалить навсегда
          </Button>
        </div>
      </Modal>
    </Card>
  );
};

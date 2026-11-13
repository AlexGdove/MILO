import { useState } from 'react';

import { accountApi, useSessionStore } from '@/entities/account';
import { Button } from '@/shared/ui';

import styles from './AuthForm.module.css';
import { FormError } from './FormError';
import { ResetPasswordForm } from './ResetPasswordForm';
import { useSubmit } from '../model/useSubmit';

/**
 * «Сменить пароль» для вошедшего (просьба владельца 2026-11-13): код на почту → новый пароль;
 * прежние сессии закрываются, эта получает новую.
 */
export const ChangePassword = ({ email }: { email: string }) => {
  const signIn = useSessionStore((state) => state.signIn);
  const [step, setStep] = useState<'idle' | 'code' | 'done'>('idle');

  const send = useSubmit<null>(async () => {
    await accountApi.forgotPassword(email);
    setStep('code');
  });

  if (step === 'done') {
    return (
      <p className={styles.hint} role="status">
        Пароль изменён
      </p>
    );
  }

  if (step === 'code') {
    return (
      <div className={styles.form}>
        <p className={styles.hint}>Код отправлен на {email}. Введите его и новый пароль.</p>
        <ResetPasswordForm
          email={email}
          onSubmit={async (values) => {
            signIn(await accountApi.resetPassword(email, values.code, values.password));
            setStep('done');
          }}
          onResend={async () => {
            await accountApi.forgotPassword(email);
          }}
        />
        <Button variant="ghost" onClick={() => setStep('idle')}>
          Отмена
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button variant="secondary" disabled={send.pending} onClick={() => void send.submit(null)}>
        Сменить пароль
      </Button>
      <FormError error={send.error} />
    </>
  );
};

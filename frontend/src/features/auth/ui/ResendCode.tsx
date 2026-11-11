import { useState } from 'react';

import { Button } from '@/shared/ui';

import styles from './AuthForm.module.css';
import { FormError } from './FormError';
import { useSubmit } from '../model/useSubmit';

/** «Отправить код ещё раз» с подтверждением и ошибкой (лимит писем — на сервере). */
export const ResendCode = ({ onResend }: { onResend: () => Promise<void> }) => {
  const [resent, setResent] = useState(false);
  const resend = useSubmit<null>(async () => {
    setResent(false);
    await onResend();
    setResent(true);
  });

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        fullWidth
        disabled={resend.pending}
        onClick={() => void resend.submit(null)}
      >
        Отправить код ещё раз
      </Button>
      {resent && <p className={styles.hint}>Новый код отправлен</p>}
      <FormError error={resend.error} />
    </>
  );
};

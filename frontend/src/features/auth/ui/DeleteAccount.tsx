import { useState } from 'react';

import { accountApi, useSessionStore } from '@/entities/account';
import { Button, Modal } from '@/shared/ui';

import styles from './AuthForm.module.css';
import { FormError } from './FormError';
import { useSubmit } from '../model/useSubmit';

/**
 * «Удалить аккаунт» с подтверждением в окне (решение №69): аккаунт и тариф удаляются на сервере,
 * данные на устройстве остаются. Ошибка — в окне, сессия при ошибке не сбрасывается.
 */
export const DeleteAccount = ({ token }: { token: string }) => {
  const signOut = useSessionStore((state) => state.signOut);
  const [open, setOpen] = useState(false);
  const remove = useSubmit<null>(async () => {
    await accountApi.remove(token);
    signOut();
  });

  return (
    <>
      <Button variant="ghost" disabled={remove.pending} onClick={() => setOpen(true)}>
        Удалить аккаунт
      </Button>
      <Modal open={open} title="Удалить аккаунт?" onClose={() => setOpen(false)}>
        <div className={styles.form}>
          <p className={styles.hint}>
            Аккаунт и оплаченный тариф будут удалены без возможности восстановления. Данные на этом
            устройстве останутся.
          </p>
          <FormError error={remove.error} />
          <Button
            variant="danger"
            disabled={remove.pending}
            onClick={() => void remove.submit(null)}
          >
            Удалить навсегда
          </Button>
        </div>
      </Modal>
    </>
  );
};

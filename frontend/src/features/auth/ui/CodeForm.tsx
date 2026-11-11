import { useState, type FormEvent } from 'react';

import { Button, Input } from '@/shared/ui';

import styles from './AuthForm.module.css';
import { FormError } from './FormError';
import { ResendCode } from './ResendCode';
import { useSubmit } from '../model/useSubmit';
import { codeError, toCode } from '../model/validation';

interface CodeFormProps {
  /** Куда отправлен код */
  email: string;
  onSubmit: (code: string) => Promise<void>;
  /** Отправить код ещё раз */
  onResend: () => Promise<void>;
}

/** Подтверждение почты кодом из письма. */
export const CodeForm = ({ email, onSubmit, onResend }: CodeFormProps) => {
  const [code, setCode] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { pending, error, submit } = useSubmit(onSubmit);
  const fieldError = codeError(code);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (fieldError) return;
    void submit(code);
  };

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <p className={styles.hint}>
        Мы отправили код на {email}. Он действует 10 минут. Если письма нет — проверьте папку
        «Спам».
      </p>
      <Input
        label="Код из письма"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        name="code"
        value={code}
        onChange={(event) => setCode(toCode(event.target.value))}
        error={submitted ? fieldError : undefined}
      />
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? '…' : 'Подтвердить'}
      </Button>
      <FormError error={error} />
      <ResendCode onResend={onResend} />
    </form>
  );
};

import { useState, type FormEvent } from 'react';

import { Button, Input } from '@/shared/ui';

import styles from './AuthForm.module.css';
import { FormError } from './FormError';
import { useSubmit } from '../model/useSubmit';
import { emailError } from '../model/validation';

interface ForgotPasswordFormProps {
  defaultEmail?: string;
  onSubmit: (values: { email: string }) => Promise<void>;
}

/** «Забыли пароль»: почта, на которую придёт код для нового пароля. */
export const ForgotPasswordForm = ({ defaultEmail = '', onSubmit }: ForgotPasswordFormProps) => {
  const [email, setEmail] = useState(defaultEmail);
  const [submitted, setSubmitted] = useState(false);
  const { pending, error, submit } = useSubmit(onSubmit);
  const fieldError = emailError(email);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (fieldError) return;
    void submit({ email: email.trim() });
  };

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <p className={styles.hint}>Пришлём на почту код для нового пароля.</p>
      <Input
        label="Почта"
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={submitted ? fieldError : undefined}
      />
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? '…' : 'Получить код'}
      </Button>
      <FormError error={error} />
    </form>
  );
};

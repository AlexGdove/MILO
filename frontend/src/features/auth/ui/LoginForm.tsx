import { useState, type FormEvent } from 'react';

import { Button, Input, PasswordInput } from '@/shared/ui';

import styles from './AuthForm.module.css';
import { FormError } from './FormError';
import { useSubmit } from '../model/useSubmit';
import { emailError } from '../model/validation';

interface LoginFormProps {
  /** Начальная почта (например, после регистрации) */
  defaultEmail?: string;
  onSubmit: (values: { email: string; password: string }) => Promise<void>;
}

/** Вход почтой и паролем. Ошибки полей — после первой попытки отправки. */
export const LoginForm = ({ defaultEmail = '', onSubmit }: LoginFormProps) => {
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { pending, error, submit } = useSubmit(onSubmit);

  const errors = {
    email: emailError(email),
    password: password ? undefined : 'Введите пароль',
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (errors.email || errors.password) return;
    void submit({ email: email.trim(), password });
  };

  return (
    <form className={styles.form} noValidate onSubmit={handleSubmit}>
      <Input
        label="Почта"
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={submitted ? errors.email : undefined}
      />
      <PasswordInput
        label="Пароль"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={submitted ? errors.password : undefined}
      />
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? '…' : 'Войти'}
      </Button>
      <FormError error={error} />
    </form>
  );
};

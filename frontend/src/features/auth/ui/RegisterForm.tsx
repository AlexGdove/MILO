import { useState, type FormEvent } from 'react';

import { Button, Input, PasswordInput } from '@/shared/ui';

import styles from './AuthForm.module.css';
import { FormError } from './FormError';
import { useSubmit } from '../model/useSubmit';
import {
  emailError,
  newPasswordError,
  PASSWORD_MIN_LENGTH,
  repeatError,
} from '../model/validation';

interface RegisterFormProps {
  onSubmit: (values: { email: string; password: string }) => Promise<void>;
}

/** Регистрация: почта, пароль и его повтор. После отправки на почту придёт код. */
export const RegisterForm = ({ onSubmit }: RegisterFormProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { pending, error, submit } = useSubmit(onSubmit);

  const errors = {
    email: emailError(email),
    password: newPasswordError(password),
    repeat: repeatError(password, repeat),
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (errors.email || errors.password || errors.repeat) return;
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
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={submitted ? errors.password : undefined}
      />
      <p className={styles.hint}>
        Не меньше {PASSWORD_MIN_LENGTH} символов, латинскими буквами, цифрами и знаками
      </p>
      <PasswordInput
        label="Повторите пароль"
        name="repeat"
        autoComplete="new-password"
        value={repeat}
        onChange={(event) => setRepeat(event.target.value)}
        error={submitted ? errors.repeat : undefined}
      />
      <Button type="submit" fullWidth disabled={pending}>
        {pending ? '…' : 'Зарегистрироваться'}
      </Button>
      <FormError error={error} />
    </form>
  );
};

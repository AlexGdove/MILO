import { useState, type FormEvent } from 'react';

import { Button, Input, PasswordInput } from '@/shared/ui';

import styles from './AuthForm.module.css';
import { FormError } from './FormError';
import { ResendCode } from './ResendCode';
import { useSubmit } from '../model/useSubmit';
import {
  codeError,
  newPasswordError,
  PASSWORD_MIN_LENGTH,
  repeatError,
  toCode,
} from '../model/validation';

interface ResetPasswordFormProps {
  email: string;
  onSubmit: (values: { code: string; password: string }) => Promise<void>;
  onResend: () => Promise<void>;
}

/** Новый пароль по коду из письма. */
export const ResetPasswordForm = ({ email, onSubmit, onResend }: ResetPasswordFormProps) => {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const { pending, error, submit } = useSubmit(onSubmit);

  const errors = {
    code: codeError(code),
    password: newPasswordError(password),
    repeat: repeatError(password, repeat),
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (errors.code || errors.password || errors.repeat) return;
    void submit({ code, password });
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
        error={submitted ? errors.code : undefined}
      />
      <PasswordInput
        label="Новый пароль"
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
        {pending ? '…' : 'Сохранить пароль'}
      </Button>
      <FormError error={error} />
      <ResendCode onResend={onResend} />
    </form>
  );
};

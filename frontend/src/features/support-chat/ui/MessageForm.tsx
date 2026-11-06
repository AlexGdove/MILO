import { useId, useRef, useState, type FormEvent } from 'react';

import { MESSAGE_MAX_LENGTH } from '@/entities/support-ticket';
import { createUuid } from '@/shared/lib';
import { Button } from '@/shared/ui';

import styles from './SupportChat.module.css';
import { supportErrorText } from '../model/queries';

interface MessageFormProps {
  label: string;
  placeholder: string;
  submitLabel: string;
  pending: boolean;
  error: unknown;
  /** Отправка; ключ идемпотентности один на текст — повтор после сбоя не создаст дубль */
  onSend: (text: string, idempotencyKey: string) => Promise<unknown>;
}

/** Поле сообщения в поддержку с отправкой (1–4000 символов, как на сервере). */
export const MessageForm = ({
  label,
  placeholder,
  submitLabel,
  pending,
  error,
  onSend,
}: MessageFormProps) => {
  const id = useId();
  const [text, setText] = useState('');
  const idempotencyKey = useRef(createUuid());
  const trimmed = text.trim();
  const tooLong = trimmed.length > MESSAGE_MAX_LENGTH;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || tooLong || pending) return;
    try {
      await onSend(trimmed, idempotencyKey.current);
      setText('');
      idempotencyKey.current = createUuid();
    } catch {
      // Ошибку показывает mutation (error); текст остаётся — можно отправить снова
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className={styles.textarea}
        rows={3}
        placeholder={placeholder}
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          // Другой текст — другой запрос: новый ключ идемпотентности
          idempotencyKey.current = createUuid();
        }}
        aria-invalid={tooLong || undefined}
      />
      {tooLong && (
        <p className={styles.error} role="alert">
          Не больше {MESSAGE_MAX_LENGTH} символов — сейчас {trimmed.length}.
        </p>
      )}
      {error !== null && error !== undefined && !tooLong && (
        <p className={styles.error} role="alert">
          {supportErrorText(error)}
        </p>
      )}
      <Button type="submit" fullWidth disabled={!trimmed || tooLong || pending}>
        {pending ? 'Отправляем…' : submitLabel}
      </Button>
    </form>
  );
};

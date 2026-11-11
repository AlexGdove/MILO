import { useState } from 'react';

/**
 * Отправка формы аккаунта: пока запрос идёт — `pending`; отказ — `error` (текст даёт
 * `authErrorText`). Повторная отправка сбрасывает прежнюю ошибку.
 */
export function useSubmit<T>(onSubmit: (values: T) => Promise<void>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const submit = async (values: T) => {
    setPending(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (failure) {
      setError(failure);
    } finally {
      setPending(false);
    }
  };

  return { pending, error, submit };
}

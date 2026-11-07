import { type FormEvent, useState } from 'react';

import type { Product } from '@/entities/product';
import {
  rejectionReason,
  selectSubmission,
  type SubmissionRecord,
  useSubmissionStore,
} from '@/entities/product-submission';
import { isApiEnabled } from '@/shared/api';
import { Button, Input } from '@/shared/ui';

import styles from './SuggestProduct.module.css';
import {
  newAttemptKey,
  suggestErrorText,
  useSubmissionSync,
  useSuggestProduct,
} from '../model/queries';

interface SuggestProductProps {
  product: Product;
}

const StatusLine = ({ record }: { record: SubmissionRecord }) => {
  switch (record.status) {
    case 'pending':
      return <p className={styles.status}>🕓 На проверке у модератора</p>;
    case 'approved':
      return <p className={styles.status}>✓ В общей базе MILO — спасибо!</p>;
    case 'rejected':
      return (
        <p className={styles.status}>Не принято в общую базу: {rejectionReason(record.flags)}</p>
      );
  }
};

/**
 * «Предложить в общую базу» (B-18) в окне продукта: на сервер уходят название, бренд,
 * штрихкод, единица и КБЖУ — без остатков. Автомодерация решает сразу, сомнительное — оператору
 * в Telegram; статус виден здесь же. Без сервера блока нет.
 */
export const SuggestProduct = ({ product }: SuggestProductProps) => {
  useSubmissionSync();
  const record = useSubmissionStore(selectSubmission(product.id));
  const suggest = useSuggestProduct(product);
  const [open, setOpen] = useState(false);
  const [brand, setBrand] = useState('');
  const [barcode, setBarcode] = useState('');
  const [attemptKey, setAttemptKey] = useState(newAttemptKey);

  if (!isApiEnabled()) return null;

  const canRetry = record?.status === 'rejected';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    suggest.mutate(
      { extras: { brand, barcode }, idempotencyKey: attemptKey },
      {
        onSuccess: () => {
          setOpen(false);
          setAttemptKey(newAttemptKey());
        },
      },
    );
  };

  // Другие данные — другая попытка: старый ключ идемпотентности вернул бы прежний ответ
  const change = (setter: (value: string) => void) => (value: string) => {
    setter(value);
    setAttemptKey(newAttemptKey());
    suggest.reset();
  };

  return (
    <section className={styles.section} aria-label="Общая база MILO">
      <h3 className={styles.title}>Общая база MILO</h3>
      {record && <StatusLine record={record} />}
      {(!record || canRetry) && !open && (
        <>
          {!record && (
            <p className={styles.hint}>Поделитесь продуктом — его смогут найти другие.</p>
          )}
          <Button variant="secondary" size="small" onClick={() => setOpen(true)}>
            {canRetry ? 'Предложить снова' : 'Предложить в общую базу'}
          </Button>
        </>
      )}
      {open && (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <Input
            label="Бренд (необязательно)"
            value={brand}
            maxLength={80}
            onChange={(event) => change(setBrand)(event.target.value)}
          />
          <Input
            label="Штрихкод (необязательно)"
            value={barcode}
            inputMode="numeric"
            maxLength={16}
            onChange={(event) => change(setBarcode)(event.target.value)}
          />
          <p className={styles.hint}>
            Отправятся название, единица и КБЖУ. Остатки и другие ваши данные — нет.
          </p>
          {suggest.isError && (
            <p className={styles.error} role="alert">
              {suggestErrorText(suggest.error)}
            </p>
          )}
          <div className={styles.buttons}>
            <Button type="submit" size="small" disabled={suggest.isPending}>
              {suggest.isPending ? 'Отправляем…' : 'Отправить'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="small"
              onClick={() => {
                setOpen(false);
                suggest.reset();
              }}
            >
              Отмена
            </Button>
          </div>
        </form>
      )}
    </section>
  );
};

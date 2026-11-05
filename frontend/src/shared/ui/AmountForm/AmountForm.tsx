import { useState, type FormEvent, type ReactNode } from 'react';

import { parseNumber, roundAmount, unitLabel, type Unit } from '@/shared/lib';

import styles from './AmountForm.module.css';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';

interface AmountFormProps {
  /** Начало подписи поля, единица добавляется сама: «Сколько купить» → «Сколько купить, г» */
  label: string;
  unit: Unit;
  initialAmount: number;
  submitLabel: string;
  /** Подсказки над полем (остаток, минимум и т. п.) */
  hints?: ReactNode;
  onSubmit: (amount: number) => void;
}

/** Форма ввода положительного количества в единице продукта (запятая как разделитель допускается). */
export const AmountForm = ({
  label,
  unit,
  initialAmount,
  submitLabel,
  hints,
  onSubmit,
}: AmountFormProps) => {
  const [value, setValue] = useState(() => String(initialAmount).replace('.', ','));
  const [error, setError] = useState<string>();

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const amount = parseNumber(value);
    if (amount === null || roundAmount(amount, unit) <= 0) {
      setError('Укажите количество больше нуля');
      return;
    }
    onSubmit(amount);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {hints && <div className={styles.hints}>{hints}</div>}
      <Input
        label={`${label}, ${unitLabel(unit)}`}
        inputMode="decimal"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        error={error}
      />
      <Button type="submit" fullWidth>
        {submitLabel}
      </Button>
    </form>
  );
};

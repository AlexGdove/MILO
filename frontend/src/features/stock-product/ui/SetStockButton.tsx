import { useState } from 'react';

import { useProductStore, type Product } from '@/entities/product';
import { cn, formatAmount, parseNumber, roundAmount, unitLabel, type Unit } from '@/shared/lib';
import { Button, Input, Modal } from '@/shared/ui';

import styles from './SetStockButton.module.css';

/** Шаг кнопок −/+ по единице продукта. */
const STEP: Record<Unit, number> = { g: 50, ml: 100, pcs: 1 };

interface StockFormProps {
  product: Product;
  onDone: () => void;
}

const StockForm = ({ product, onDone }: StockFormProps) => {
  const adjustStock = useProductStore((state) => state.adjustStock);
  const [value, setValue] = useState(String(product.stock).replace('.', ','));
  const [error, setError] = useState<string>();
  const step = STEP[product.unit];

  const current = () => parseNumber(value) ?? 0;
  const setAmount = (amount: number) => {
    setError(undefined);
    setValue(String(Math.max(0, roundAmount(amount, product.unit))).replace('.', ','));
  };

  const save = (amount: number | null) => {
    if (amount === null || amount < 0) {
      setError('Число 0 или больше');
      return;
    }
    // Остаток задаётся точным значением: прибавляем разницу к текущему
    adjustStock(product.id, roundAmount(amount, product.unit) - product.stock);
    onDone();
  };

  return (
    <div className={styles.form}>
      <div className={styles.row}>
        <Button
          variant="secondary"
          onClick={() => setAmount(current() - step)}
          aria-label={`Меньше на ${formatAmount(step, product.unit)}`}
        >
          −
        </Button>
        <Input
          className={styles.input}
          label={`Остаток, ${unitLabel(product.unit)}`}
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          error={error}
        />
        <Button
          variant="secondary"
          onClick={() => setAmount(current() + step)}
          aria-label={`Больше на ${formatAmount(step, product.unit)}`}
        >
          +
        </Button>
      </div>
      <div className={styles.actions}>
        <Button variant="danger" onClick={() => save(0)}>
          Закончилось
        </Button>
        <Button onClick={() => save(parseNumber(value))}>Сохранить</Button>
      </div>
    </div>
  );
};

interface SetStockButtonProps {
  product: Product;
}

/** Строка остатка в карточке: нажатие открывает быструю правку количества. */
export const SetStockButton = ({ product }: SetStockButtonProps) => {
  const [open, setOpen] = useState(false);
  const out = product.stock <= 0;

  return (
    <>
      <button
        type="button"
        className={cn(styles.trigger, out && styles.triggerEmpty)}
        onClick={() => setOpen(true)}
        aria-label={`${product.name}: изменить остаток`}
      >
        {out ? 'Нет в наличии' : `В наличии: ${formatAmount(product.stock, product.unit)}`}
        <span className={styles.chevron} aria-hidden="true">
          ▾
        </span>
      </button>
      <Modal open={open} title={product.name} onClose={() => setOpen(false)}>
        <StockForm product={product} onDone={() => setOpen(false)} />
      </Modal>
    </>
  );
};

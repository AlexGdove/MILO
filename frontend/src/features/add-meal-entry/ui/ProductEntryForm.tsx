import { useState, type FormEvent } from 'react';

import { MEAL_TYPES, useMealEntryStore, type MealType } from '@/entities/meal-entry';
import { useProductStore, type Product } from '@/entities/product';
import {
  formatAmount,
  formatGrams,
  formatKcal,
  nutrientsForGrams,
  parseNumber,
  toGrams,
  type IsoDate,
  type Unit,
} from '@/shared/lib';
import { Button, Input, SegmentedControl } from '@/shared/ui';

import styles from './AddMealEntryForm.module.css';
import { SelectedSource } from './SelectedSource';

const AMOUNT_LABEL: Record<Unit, string> = {
  g: 'Вес, г',
  ml: 'Объём, мл',
  pcs: 'Количество, шт',
};

const AMOUNT_ERROR: Record<Unit, string> = {
  g: 'Введите вес больше 0',
  ml: 'Введите объём больше 0',
  pcs: 'Введите количество больше 0',
};

const DEFAULT_AMOUNT: Record<Unit, string> = { g: '100', ml: '100', pcs: '1' };

interface ProductEntryFormProps {
  product: Product;
  date: IsoDate;
  initialMealType: MealType;
  onChangeSource: () => void;
  onDone: () => void;
}

/** Запись продукта: количество в его единице, списание с остатка — по желанию. */
export const ProductEntryForm = ({
  product,
  date,
  initialMealType,
  onChangeSource,
  onDone,
}: ProductEntryFormProps) => {
  const adjustStock = useProductStore((state) => state.adjustStock);
  const addEntry = useMealEntryStore((state) => state.addEntry);
  const [amountInput, setAmountInput] = useState(DEFAULT_AMOUNT[product.unit]);
  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [deductStock, setDeductStock] = useState(product.stock > 0);

  const amount = parseNumber(amountInput);
  const isAmountValid = amount !== null && amount > 0;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!isAmountValid) return;

    // Списываем не больше, чем есть; количество — в единице продукта
    const deducted = deductStock ? Math.min(amount, product.stock) : 0;
    addEntry({
      date,
      mealType,
      source: { type: 'product', id: product.id },
      productName: product.name,
      per100g: product.per100g,
      amount,
      unit: product.unit,
      grams: toGrams(amount, product.unit, product.pieceWeight),
      stockDeducted: deducted,
    });
    if (deducted > 0) adjustStock(product.id, -deducted);
    onDone();
  };

  const grams = isAmountValid ? toGrams(amount, product.unit, product.pieceWeight) : 0;
  const preview = nutrientsForGrams(product.per100g, grams);

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <SelectedSource
        name={product.name}
        meta={`${formatKcal(product.per100g.kcal)} ккал / ${product.unit === 'ml' ? '100 мл' : '100 г'}${
          product.unit === 'pcs' && product.pieceWeight
            ? ` · 1 шт ≈ ${formatGrams(product.pieceWeight)} г`
            : ''
        }`}
        changeLabel="← Другой продукт"
        onChange={onChangeSource}
      />

      <Input
        label={AMOUNT_LABEL[product.unit]}
        inputMode="decimal"
        value={amountInput}
        onChange={(event) => setAmountInput(event.target.value)}
        error={isAmountValid ? undefined : AMOUNT_ERROR[product.unit]}
      />

      <SegmentedControl
        legend="Приём пищи"
        options={MEAL_TYPES}
        value={mealType}
        onChange={setMealType}
      />

      {product.stock > 0 && (
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={deductStock}
            onChange={(event) => setDeductStock(event.target.checked)}
          />
          Списать с остатков (есть {formatAmount(product.stock, product.unit)})
        </label>
      )}

      <p className={styles.preview}>
        <strong>{formatKcal(preview.kcal)} ккал</strong> · Б {formatGrams(preview.protein)} · Ж{' '}
        {formatGrams(preview.fat)} · У {formatGrams(preview.carbs)}
      </p>

      <Button type="submit" fullWidth disabled={!isAmountValid}>
        Добавить
      </Button>
    </form>
  );
};

import { useState, type FormEvent } from 'react';

import { MEAL_TYPES, useMealEntryStore, type MealType } from '@/entities/meal-entry';
import { filterProducts, selectProducts, useProductStore, type Product } from '@/entities/product';
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

interface AddMealEntryFormProps {
  date: IsoDate;
  initialMealType: MealType;
  onDone: () => void;
}

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

export const AddMealEntryForm = ({ date, initialMealType, onDone }: AddMealEntryFormProps) => {
  const products = useProductStore(selectProducts);
  const adjustStock = useProductStore((state) => state.adjustStock);
  const addEntry = useMealEntryStore((state) => state.addEntry);

  const [query, setQuery] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [amountInput, setAmountInput] = useState('100');
  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [deductStock, setDeductStock] = useState(false);

  const amount = parseNumber(amountInput);
  const isAmountValid = amount !== null && amount > 0;

  const selectProduct = (selected: Product) => {
    setProduct(selected);
    setAmountInput(DEFAULT_AMOUNT[selected.unit]);
    setDeductStock(selected.stock > 0);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!product || !isAmountValid) return;

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

  if (!product) {
    const found = filterProducts(products, query)
      .slice()
      .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.name.localeCompare(b.name));

    return (
      <div className={styles.picker}>
        <Input
          type="search"
          placeholder="Найти продукт"
          aria-label="Найти продукт"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <ul className={styles.options}>
          {found.map((item) => (
            <li key={item.id}>
              <button type="button" className={styles.option} onClick={() => selectProduct(item)}>
                <span className={styles.optionName}>{item.name}</span>
                <span className={styles.optionMeta}>
                  {formatKcal(item.per100g.kcal)} ккал/{item.unit === 'ml' ? '100 мл' : '100 г'}
                  {item.stock > 0 && ` · есть ${formatAmount(item.stock, item.unit)}`}
                </span>
              </button>
            </li>
          ))}
          {found.length === 0 && (
            <li className={styles.empty}>Продукт не найден — добавьте его на вкладке «Кладовая»</li>
          )}
        </ul>
      </div>
    );
  }

  const grams = isAmountValid ? toGrams(amount, product.unit, product.pieceWeight) : 0;
  const preview = nutrientsForGrams(product.per100g, grams);

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.selected}>
        <div>
          <p className={styles.optionName}>{product.name}</p>
          <p className={styles.optionMeta}>
            {formatKcal(product.per100g.kcal)} ккал / {product.unit === 'ml' ? '100 мл' : '100 г'}
            {product.unit === 'pcs' && product.pieceWeight
              ? ` · 1 шт ≈ ${formatGrams(product.pieceWeight)} г`
              : ''}
          </p>
        </div>
        <Button variant="ghost" size="small" onClick={() => setProduct(null)}>
          Изменить
        </Button>
      </div>

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

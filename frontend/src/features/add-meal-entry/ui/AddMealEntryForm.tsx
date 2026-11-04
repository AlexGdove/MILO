import { useState, type FormEvent } from 'react';

import { MEAL_TYPES, useMealEntryStore, type MealType } from '@/entities/meal-entry';
import { filterProducts, selectProducts, useProductStore, type Product } from '@/entities/product';
import {
  cn,
  formatGrams,
  formatKcal,
  nutrientsForGrams,
  parseNumber,
  type IsoDate,
} from '@/shared/lib';
import { Button, Input } from '@/shared/ui';

import styles from './AddMealEntryForm.module.css';

interface AddMealEntryFormProps {
  date: IsoDate;
  initialMealType: MealType;
  onDone: () => void;
}

export const AddMealEntryForm = ({ date, initialMealType, onDone }: AddMealEntryFormProps) => {
  const products = useProductStore(selectProducts);
  const adjustStock = useProductStore((state) => state.adjustStock);
  const addEntry = useMealEntryStore((state) => state.addEntry);

  const [query, setQuery] = useState('');
  const [product, setProduct] = useState<Product | null>(null);
  const [gramsInput, setGramsInput] = useState('100');
  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [deductStock, setDeductStock] = useState(false);

  const grams = parseNumber(gramsInput);
  const isGramsValid = grams !== null && grams > 0;

  const selectProduct = (selected: Product) => {
    setProduct(selected);
    setDeductStock(selected.stock > 0);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!product || !isGramsValid) return;

    const deducted = deductStock ? Math.min(grams, product.stock) : 0;
    addEntry({
      date,
      mealType,
      productId: product.id,
      productName: product.name,
      per100g: product.per100g,
      grams,
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
                  {formatKcal(item.per100g.kcal)} ккал/100 г
                  {item.stock > 0 && ` · есть ${formatGrams(item.stock)} г`}
                </span>
              </button>
            </li>
          ))}
          {found.length === 0 && (
            <li className={styles.empty}>Продукт не найден — добавьте его на вкладке «Продукты»</li>
          )}
        </ul>
      </div>
    );
  }

  const preview = nutrientsForGrams(product.per100g, isGramsValid ? grams : 0);

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.selected}>
        <div>
          <p className={styles.optionName}>{product.name}</p>
          <p className={styles.optionMeta}>{formatKcal(product.per100g.kcal)} ккал / 100 г</p>
        </div>
        <Button variant="ghost" size="small" onClick={() => setProduct(null)}>
          Изменить
        </Button>
      </div>

      <Input
        label="Вес, г"
        inputMode="decimal"
        value={gramsInput}
        onChange={(event) => setGramsInput(event.target.value)}
        error={isGramsValid ? undefined : 'Введите вес больше 0'}
      />

      <fieldset className={styles.meals}>
        <legend className={styles.legend}>Приём пищи</legend>
        {MEAL_TYPES.map((item) => (
          <label
            key={item.value}
            className={cn(styles.chip, mealType === item.value && styles.chipActive)}
          >
            <input
              type="radio"
              name="mealType"
              value={item.value}
              checked={mealType === item.value}
              onChange={() => setMealType(item.value)}
            />
            {item.label}
          </label>
        ))}
      </fieldset>

      {product.stock > 0 && (
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={deductStock}
            onChange={(event) => setDeductStock(event.target.checked)}
          />
          Списать с остатков (есть {formatGrams(product.stock)} г)
        </label>
      )}

      <p className={styles.preview}>
        <strong>{formatKcal(preview.kcal)} ккал</strong> · Б {formatGrams(preview.protein)} · Ж{' '}
        {formatGrams(preview.fat)} · У {formatGrams(preview.carbs)}
      </p>

      <Button type="submit" fullWidth disabled={!isGramsValid}>
        Добавить
      </Button>
    </form>
  );
};

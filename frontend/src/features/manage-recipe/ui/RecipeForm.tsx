import { useId, useState, type FormEvent } from 'react';

import type { Product } from '@/entities/product';
import type { RecipeDraft } from '@/entities/recipe';
import { createId, parseNumber, roundAmount, unitLabel } from '@/shared/lib';
import { Button, Input } from '@/shared/ui';

import styles from './RecipeForm.module.css';

interface RecipeFormProps {
  /** Все продукты кладовой (и закончившиеся): ингредиент выбирается из них */
  products: readonly Product[];
  initial?: RecipeDraft;
  submitLabel: string;
  onSubmit: (draft: RecipeDraft) => void;
  onDelete?: () => void;
}

interface IngredientRow {
  key: string;
  productId: string;
  amount: string;
}

type Errors = {
  name?: string;
  servings?: string;
  ingredients?: string;
  rows?: Record<string, string>;
};

const toRows = (draft?: RecipeDraft): IngredientRow[] =>
  draft?.ingredients.length
    ? draft.ingredients.map((item) => ({
        key: createId(),
        productId: item.productId,
        amount: String(item.amount).replace('.', ','),
      }))
    : [{ key: createId(), productId: '', amount: '' }];

export const RecipeForm = ({
  products,
  initial,
  submitLabel,
  onSubmit,
  onDelete,
}: RecipeFormProps) => {
  const formId = useId();
  const [name, setName] = useState(initial?.name ?? '');
  const [servings, setServings] = useState(String(initial?.servings ?? 2));
  const [rows, setRows] = useState<IngredientRow[]>(() => toRows(initial));
  const [errors, setErrors] = useState<Errors>({});

  const productById = new Map(products.map((product) => [product.id, product]));
  const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name, 'ru-RU'));

  const updateRow = (key: string, patch: Partial<IngredientRow>) =>
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const validate = (): { errors: Errors; draft?: RecipeDraft } => {
    const next: Errors = {};
    if (!name.trim()) next.name = 'Введите название';
    const servingsValue = parseNumber(servings);
    if (servingsValue === null || !Number.isInteger(servingsValue) || servingsValue < 1) {
      next.servings = 'Целое число от 1';
    }

    const rowErrors: Record<string, string> = {};
    const seen = new Set<string>();
    const ingredients: RecipeDraft['ingredients'] = [];
    for (const row of rows) {
      const product = productById.get(row.productId);
      const amount = parseNumber(row.amount);
      if (!product) rowErrors[row.key] = 'Выберите продукт';
      else if (seen.has(product.id)) rowErrors[row.key] = 'Продукт уже есть в рецепте';
      else if (amount === null || roundAmount(amount, product.unit) <= 0) {
        rowErrors[row.key] = 'Количество больше нуля';
      } else {
        seen.add(product.id);
        ingredients.push({
          productId: product.id,
          amount: roundAmount(amount, product.unit),
          unit: product.unit,
        });
      }
    }
    if (rows.length === 0) next.ingredients = 'Добавьте хотя бы один ингредиент';
    if (Object.keys(rowErrors).length > 0) next.rows = rowErrors;

    if (Object.keys(next).length > 0) return { errors: next };
    return {
      errors: next,
      draft: { name: name.trim(), servings: servingsValue as number, ingredients },
    };
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = validate();
    setErrors(result.errors);
    if (result.draft) onSubmit(result.draft);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Input
        label="Название"
        value={name}
        onChange={(event) => setName(event.target.value)}
        error={errors.name}
      />
      <Input
        label="Порций"
        inputMode="numeric"
        value={servings}
        onChange={(event) => setServings(event.target.value)}
        error={errors.servings}
      />

      <fieldset className={styles.ingredients}>
        <legend className={styles.legend}>Ингредиенты (на все порции)</legend>
        {products.length === 0 && (
          <p className={styles.hint}>
            Сначала добавьте продукты в кладовую — ингредиенты берутся из них.
          </p>
        )}
        {rows.map((row, index) => {
          const product = productById.get(row.productId);
          const selectId = `${formId}-product-${row.key}`;
          const rowError = errors.rows?.[row.key];
          return (
            <div key={row.key} className={styles.row}>
              <div className={styles.rowFields}>
                <select
                  id={selectId}
                  aria-label={`Продукт ${index + 1}`}
                  className={styles.select}
                  value={row.productId}
                  onChange={(event) => updateRow(row.key, { productId: event.target.value })}
                  aria-invalid={Boolean(rowError)}
                >
                  <option value="">Продукт…</option>
                  {sortedProducts.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
                <Input
                  className={styles.amount}
                  aria-label={`Количество ${index + 1}`}
                  placeholder={product ? unitLabel(product.unit) : 'кол-во'}
                  inputMode="decimal"
                  value={row.amount}
                  onChange={(event) => updateRow(row.key, { amount: event.target.value })}
                />
                <span className={styles.unit}>{product ? unitLabel(product.unit) : ''}</span>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => setRows((current) => current.filter((r) => r.key !== row.key))}
                  aria-label={`Убрать ингредиент ${index + 1}`}
                >
                  ×
                </Button>
              </div>
              {rowError && <span className={styles.error}>{rowError}</span>}
            </div>
          );
        })}
        {errors.ingredients && <span className={styles.error}>{errors.ingredients}</span>}
        <Button
          variant="secondary"
          size="small"
          onClick={() =>
            setRows((current) => [...current, { key: createId(), productId: '', amount: '' }])
          }
        >
          + Ингредиент
        </Button>
      </fieldset>

      <Button type="submit" fullWidth>
        {submitLabel}
      </Button>
      {onDelete && (
        <Button variant="danger" fullWidth onClick={onDelete}>
          Удалить рецепт
        </Button>
      )}
    </form>
  );
};

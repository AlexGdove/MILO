import { useState, type FormEvent } from 'react';

import type { ProductDraft } from '@/entities/product';
import { parseNumber } from '@/shared/lib';
import { Button, Input } from '@/shared/ui';

import styles from './ProductForm.module.css';

interface ProductFormProps {
  initial?: ProductDraft;
  submitLabel: string;
  onSubmit: (draft: ProductDraft) => void;
  onDelete?: () => void;
}

type FieldName = 'name' | 'kcal' | 'protein' | 'fat' | 'carbs' | 'stock';
type FormValues = Record<FieldName, string>;

const toValues = (draft?: ProductDraft): FormValues => ({
  name: draft?.name ?? '',
  kcal: draft ? String(draft.per100g.kcal) : '',
  protein: draft ? String(draft.per100g.protein) : '',
  fat: draft ? String(draft.per100g.fat) : '',
  carbs: draft ? String(draft.per100g.carbs) : '',
  stock: draft ? String(draft.stock) : '0',
});

const NUMERIC_FIELDS: Array<{ name: Exclude<FieldName, 'name'>; label: string }> = [
  { name: 'kcal', label: 'Ккал / 100 г' },
  { name: 'protein', label: 'Белки, г' },
  { name: 'fat', label: 'Жиры, г' },
  { name: 'carbs', label: 'Углеводы, г' },
];

const validate = (values: FormValues) => {
  const errors: Partial<Record<FieldName, string>> = {};
  if (!values.name.trim()) errors.name = 'Введите название';
  for (const field of [...NUMERIC_FIELDS.map((f) => f.name), 'stock'] as const) {
    const value = parseNumber(values[field]);
    if (value === null || value < 0) errors[field] = 'Число ≥ 0';
  }
  return errors;
};

export const ProductForm = ({ initial, submitLabel, onSubmit, onDelete }: ProductFormProps) => {
  const [values, setValues] = useState<FormValues>(() => toValues(initial));
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? validate(values) : {};

  const setField = (field: FieldName) => (value: string) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate(values)).length > 0) return;

    const num = (field: FieldName) => parseNumber(values[field]) ?? 0;
    onSubmit({
      name: values.name.trim(),
      per100g: {
        kcal: num('kcal'),
        protein: num('protein'),
        fat: num('fat'),
        carbs: num('carbs'),
      },
      stock: num('stock'),
    });
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <Input
        label="Название"
        value={values.name}
        onChange={(e) => setField('name')(e.target.value)}
        error={errors.name}
        autoComplete="off"
      />
      <div className={styles.grid}>
        {NUMERIC_FIELDS.map((field) => (
          <Input
            key={field.name}
            label={field.label}
            inputMode="decimal"
            value={values[field.name]}
            onChange={(e) => setField(field.name)(e.target.value)}
            error={errors[field.name]}
          />
        ))}
      </div>
      <Input
        label="В наличии, г"
        inputMode="decimal"
        value={values.stock}
        onChange={(e) => setField('stock')(e.target.value)}
        error={errors.stock}
      />
      <Button type="submit" fullWidth>
        {submitLabel}
      </Button>
      {onDelete && (
        <Button variant="danger" fullWidth onClick={onDelete}>
          Удалить продукт
        </Button>
      )}
    </form>
  );
};

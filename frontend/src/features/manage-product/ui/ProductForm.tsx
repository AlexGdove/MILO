import { useState, type FormEvent } from 'react';

import { normalizeBarcode, type ProductDraft } from '@/entities/product';
import { parseNumber, unitLabel, UNITS, type Unit } from '@/shared/lib';
import { Button, Input, ScanBarcodeButton, SegmentedControl } from '@/shared/ui';

import styles from './ProductForm.module.css';

interface ProductFormProps {
  initial?: ProductDraft;
  /** Название для нового продукта (например, из строки поиска) */
  defaultName?: string;
  /** Штрихкод для нового продукта (например, отсканированный в поиске) */
  defaultBarcode?: string;
  submitLabel: string;
  onSubmit: (draft: ProductDraft) => void;
  onDelete?: () => void;
}

type NumericField = 'kcal' | 'protein' | 'fat' | 'carbs' | 'pieceWeight' | 'stock' | 'minStock';
type FieldName = 'name' | 'barcode' | NumericField;
type FormValues = Record<FieldName, string>;

const toValues = (draft?: ProductDraft): FormValues => ({
  name: draft?.name ?? '',
  barcode: draft?.barcode ?? '',
  kcal: draft ? String(draft.per100g.kcal) : '',
  protein: draft ? String(draft.per100g.protein) : '',
  fat: draft ? String(draft.per100g.fat) : '',
  carbs: draft ? String(draft.per100g.carbs) : '',
  pieceWeight: draft?.pieceWeight ? String(draft.pieceWeight) : '',
  stock: draft ? String(draft.stock) : '0',
  minStock: draft ? String(draft.minStock) : '0',
});

/** Для жидкостей КБЖУ вводится на 100 мл, для остальных — на 100 г (в том числе для штучных). */
const per100Label = (unit: Unit) => (unit === 'ml' ? '100 мл' : '100 г');

const MACRO_FIELDS: Array<{ name: 'protein' | 'fat' | 'carbs'; label: string }> = [
  { name: 'protein', label: 'Белки, г' },
  { name: 'fat', label: 'Жиры, г' },
  { name: 'carbs', label: 'Углеводы, г' },
];

const validate = (values: FormValues, unit: Unit) => {
  const errors: Partial<Record<FieldName, string>> = {};
  if (!values.name.trim()) errors.name = 'Введите название';
  if (values.barcode.trim() && !normalizeBarcode(values.barcode)) {
    errors.barcode = '8–14 цифр, как на упаковке';
  }
  const nonNegative: NumericField[] = ['kcal', 'protein', 'fat', 'carbs', 'stock', 'minStock'];
  for (const field of nonNegative) {
    const value = parseNumber(values[field]);
    if (value === null || value < 0) errors[field] = 'Число ≥ 0';
  }
  if (unit === 'pcs') {
    const weight = parseNumber(values.pieceWeight);
    if (weight === null || weight <= 0) errors.pieceWeight = 'Укажите вес одной штуки';
  }
  return errors;
};

export const ProductForm = ({
  initial,
  defaultName,
  defaultBarcode,
  submitLabel,
  onSubmit,
  onDelete,
}: ProductFormProps) => {
  const [values, setValues] = useState<FormValues>(() => {
    const base = toValues(initial);
    if (initial) return base;
    return {
      ...base,
      ...(defaultName && { name: defaultName }),
      ...(defaultBarcode && { barcode: defaultBarcode }),
    };
  });
  const [unit, setUnit] = useState<Unit>(initial?.unit ?? 'g');
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? validate(values, unit) : {};
  const unitShort = unitLabel(unit);

  const setField = (field: FieldName) => (value: string) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(true);
    if (Object.keys(validate(values, unit)).length > 0) return;

    const num = (field: NumericField) => parseNumber(values[field]) ?? 0;
    onSubmit({
      name: values.name.trim(),
      per100g: {
        kcal: num('kcal'),
        protein: num('protein'),
        fat: num('fat'),
        carbs: num('carbs'),
      },
      unit,
      ...(unit === 'pcs' ? { pieceWeight: num('pieceWeight') } : {}),
      ...(normalizeBarcode(values.barcode) ? { barcode: normalizeBarcode(values.barcode)! } : {}),
      stock: num('stock'),
      minStock: num('minStock'),
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
      <Input
        label="Штрихкод (необязательно)"
        inputMode="numeric"
        value={values.barcode}
        onChange={(e) => setField('barcode')(e.target.value)}
        error={errors.barcode}
        autoComplete="off"
        action={<ScanBarcodeButton onScan={setField('barcode')} />}
      />
      <SegmentedControl legend="Единица учёта" options={UNITS} value={unit} onChange={setUnit} />
      {unit === 'ml' && (
        <p className={styles.hint}>Для расчёта калорий 1 мл считается равным 1 г.</p>
      )}
      {unit === 'pcs' && (
        <Input
          label="Вес одной штуки, г"
          inputMode="decimal"
          value={values.pieceWeight}
          onChange={(e) => setField('pieceWeight')(e.target.value)}
          error={errors.pieceWeight}
        />
      )}
      <div className={styles.grid}>
        <Input
          label={`Ккал / ${per100Label(unit)}`}
          inputMode="decimal"
          value={values.kcal}
          onChange={(e) => setField('kcal')(e.target.value)}
          error={errors.kcal}
        />
        {MACRO_FIELDS.map((field) => (
          <Input
            key={field.name}
            label={field.label}
            inputMode="decimal"
            value={values[field.name]}
            onChange={(e) => setField(field.name)(e.target.value)}
            error={errors[field.name]}
          />
        ))}
        <Input
          label={`В наличии, ${unitShort}`}
          inputMode="decimal"
          value={values.stock}
          onChange={(e) => setField('stock')(e.target.value)}
          error={errors.stock}
        />
        <Input
          label={`Мин. остаток, ${unitShort}`}
          inputMode="decimal"
          value={values.minStock}
          onChange={(e) => setField('minStock')(e.target.value)}
          error={errors.minStock}
        />
      </div>
      <p className={styles.hint}>
        Если остаток станет меньше минимального, продукт будет отмечен как заканчивающийся. 0 — не
        отслеживать.
      </p>
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

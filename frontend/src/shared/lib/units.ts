export type Unit = 'g' | 'ml' | 'pcs';

export const UNITS: ReadonlyArray<{ value: Unit; label: string }> = [
  { value: 'g', label: 'г' },
  { value: 'ml', label: 'мл' },
  { value: 'pcs', label: 'шт' },
];

export const isUnit = (value: unknown): value is Unit =>
  typeof value === 'string' && UNITS.some((u) => u.value === value);

export const unitLabel = (unit: Unit): string => UNITS.find((u) => u.value === unit)?.label ?? '';

/** Количество в граммах для расчёта КБЖУ. */
export const toGrams = (amount: number, unit: Unit, pieceWeight?: number): number => {
  if (unit === 'g') return amount;
  if (unit === 'ml') return amount; // допущение — плотность 1 г/мл
  if (pieceWeight && pieceWeight > 0) return amount * pieceWeight;
  return 0;
};

/** Штуки — до десятых, граммы и миллилитры — до целых. */
export const roundAmount = (amount: number, unit: Unit): number =>
  unit === 'pcs' ? Math.round(amount * 10) / 10 : Math.round(amount);

export const formatAmount = (amount: number, unit: Unit): string =>
  `${roundAmount(amount, unit).toLocaleString('ru-RU')} ${unitLabel(unit)}`;

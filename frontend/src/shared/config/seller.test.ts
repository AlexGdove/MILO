import { describe, expect, it } from 'vitest';

import { SELLER, sellerValue } from './seller';

/** Контрольные цифры ИНН физического лица (12 цифр). */
const isValidPersonInn = (inn: string): boolean => {
  if (!/^\d{12}$/.test(inn)) return false;
  const digits = [...inn].map(Number);
  const check = (weights: number[]) =>
    (weights.reduce((sum, weight, index) => sum + weight * (digits[index] ?? 0), 0) % 11) % 10;
  return (
    check([7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === digits[10] &&
    check([3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8]) === digits[11]
  );
};

describe('реквизиты продавца (решение №77)', () => {
  it('ФИО указано полностью — три слова', () => {
    expect(SELLER.fullName.trim().split(/\s+/)).toHaveLength(3);
  });

  it('ИНН самозанятого — 12 цифр с верными контрольными цифрами', () => {
    expect(isValidPersonInn(SELLER.inn)).toBe(true);
  });

  it('проверка ИНН ловит опечатку в последней цифре', () => {
    const last = Number(SELLER.inn.at(-1));
    expect(isValidPersonInn(`${SELLER.inn.slice(0, 11)}${(last + 1) % 10}`)).toBe(false);
  });

  it('пустой реквизит показывается как «уточняется»', () => {
    expect(sellerValue('  ')).toBe('уточняется');
    expect(sellerValue('x')).toBe('x');
  });
});

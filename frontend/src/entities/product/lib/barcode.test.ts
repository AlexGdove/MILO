import { describe, expect, it } from 'vitest';

import { normalizeBarcode } from './barcode';

describe('normalizeBarcode', () => {
  it('принимает EAN-8, EAN-13 и GTIN-14', () => {
    expect(normalizeBarcode('96385074')).toBe('96385074');
    expect(normalizeBarcode('4600000000017')).toBe('4600000000017');
    expect(normalizeBarcode('04600000000017')).toBe('04600000000017');
  });

  it('убирает пробелы внутри и по краям', () => {
    expect(normalizeBarcode(' 4600 0000 00017 ')).toBe('4600000000017');
  });

  it('слишком короткий, длинный и не цифры — null', () => {
    expect(normalizeBarcode('1234567')).toBeNull();
    expect(normalizeBarcode('123456789012345')).toBeNull();
    expect(normalizeBarcode('46000000000AB')).toBeNull();
  });

  it('пусто — null', () => {
    expect(normalizeBarcode('')).toBeNull();
    expect(normalizeBarcode(null)).toBeNull();
    expect(normalizeBarcode(undefined)).toBeNull();
  });
});

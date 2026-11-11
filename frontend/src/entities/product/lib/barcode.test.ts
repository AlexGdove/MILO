import { describe, expect, it } from 'vitest';

import { normalizeBarcode, sameBarcode, toGtin14 } from './barcode';

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

describe('sameBarcode', () => {
  it('совпадает UPC-A и EAN-13 с ведущим нулём', () => {
    expect(sameBarcode('036000291452', '0036000291452')).toBe(true);
  });

  it('совпадают одинаковые EAN-13', () => {
    expect(sameBarcode('0036000291452', '0036000291452')).toBe(true);
  });

  it('не совпадают разные коды', () => {
    expect(sameBarcode('4600000000017', '4600000000024')).toBe(false);
  });

  it('возвращает false для не штрихкодов', () => {
    expect(sameBarcode('abc', 'def')).toBe(false);
    expect(sameBarcode('1234567', '1234567890123')).toBe(false);
  });

  it('игнорирует пробелы', () => {
    expect(sameBarcode(' 0036000291452 ', '036000291452')).toBe(true);
  });
});

describe('toGtin14', () => {
  it('дополняет короткий код нулями до 14 цифр', () => {
    expect(toGtin14('96385074')).toBe('00000096385074');
  });
});

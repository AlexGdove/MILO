import { isValidBarcode } from './barcode.js';

describe('Валидация штрих-кодов', () => {
  it.each([
    ['EAN-13', '4600682000013'],
    ['EAN-13 другой', '4006381333931'],
    ['EAN-8', '96385074'],
    ['UPC-A', '036000291452'],
    ['GTIN-14', '10012345678902'],
  ])('Верный штрих-код %s', (_name, value) => {
    expect(isValidBarcode(value)).toBe(true);
  });

  it.each([
    ['неверная контрольная цифра EAN-13', '4600682000014'],
    ['неверная контрольная цифра EAN-8', '96385075'],
    ['буквы', '46006820000AB'],
    ['пробелы', '4600682 000013'],
    ['9 цифр', '123456789'],
    ['15 цифр', '123456789012345'],
    ['пустая строка', ''],
  ])('Неверный штрих-код: %s', (_name, value) => {
    expect(isValidBarcode(value)).toBe(false);
  });

  it('Неверный EAN-13 при изменении любой цифры (кроме последней)', () => {
    const valid = '4006381333931';
    for (let i = 0; i < valid.length - 1; i++) {
      const changed = valid.slice(0, i) + ((Number(valid[i]) + 1) % 10) + valid.slice(i + 1);
      expect(isValidBarcode(changed)).toBe(false);
    }
  });
});

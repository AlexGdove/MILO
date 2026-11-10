import {
  type AuditProduct,
  findDuplicateGroups,
  findSuspicious,
  formatAudit,
  productKey,
} from './catalog-audit.js';

const product = (id: string, name: string, extra: Partial<AuditProduct> = {}): AuditProduct => ({
  id,
  name,
  brand: null,
  barcode: null,
  unit: 'g',
  kcal: 100,
  protein: 10,
  fat: 2,
  carbs: 15,
  ...extra,
});

describe('productKey', () => {
  it('регистр, ё, пробелы и знаки препинания не важны, запятая и точка совпадают', () => {
    expect(productKey(product('1', 'Кефир 3,2 %'))).toBe(productKey(product('2', 'кефир 3.2%')));
    expect(productKey(product('1', 'Йогурт ёлочка'))).toBe(
      productKey(product('2', 'йогурт  елочка!')),
    );
  });

  it('другая единица или бренд — другой ключ', () => {
    expect(productKey(product('1', 'Кефир', { unit: 'ml' }))).not.toBe(
      productKey(product('2', 'Кефир', { unit: 'g' })),
    );
    expect(productKey(product('1', 'Кефир', { brand: 'Савушкин' }))).not.toBe(
      productKey(product('2', 'Кефир')),
    );
  });
});

describe('findDuplicateGroups', () => {
  it('находит группы дублей, одиночные продукты не включает, большие группы первыми', () => {
    const items = [
      product('a', 'Гречка'),
      product('b', 'Рис'),
      product('c', 'гречка'),
      product('d', 'Кефир'),
      product('e', 'Кефир.'),
      product('f', 'КЕФИР'),
    ];
    const groups = findDuplicateGroups(items);
    expect(groups.map((g) => g.map((p) => p.id))).toEqual([
      ['d', 'e', 'f'],
      ['a', 'c'],
    ]);
  });

  it('без дублей — пусто', () => {
    expect(findDuplicateGroups([product('a', 'Гречка'), product('b', 'Рис')])).toEqual([]);
  });
});

describe('findSuspicious', () => {
  it('находит бессмыслицу, ссылки и несходящуюся калорийность; нормальное пропускает', () => {
    const items = [
      product('ok', 'Гречка ядрица', { kcal: 98, protein: 10, fat: 2, carbs: 15 }),
      product('junk', 'ааааа'),
      product('spam', 'Купи тут www.example.com'),
      product('kcal', 'Странный сок', { kcal: 900, protein: 0, fat: 0, carbs: 10 }),
    ];
    const found = findSuspicious(items);
    expect(found.map((s) => [s.product.id, s.verdict])).toEqual([
      ['junk', 'reject'],
      ['spam', 'reject'],
      ['kcal', 'review'],
    ]);
    expect(found.find((s) => s.product.id === 'kcal')?.flags).toContain('energy_mismatch');
  });
});

describe('formatAudit', () => {
  it('пустая или чистая база — «Замечаний нет»', () => {
    expect(formatAudit([])).toContain('Продуктов в общей базе: 0');
    expect(formatAudit([])).toContain('Замечаний нет.');
  });

  it('в отчёте — группы дублей и подозрительные записи с кодами замечаний', () => {
    const text = formatAudit([
      product('11111111-aaaa', 'Кефир', { barcode: '4600000000017' }),
      product('22222222-bbbb', 'кефир'),
      product('33333333-cccc', 'ааааа'),
    ]);
    expect(text).toContain('Возможные дубли (одинаковые название, бренд и единица): 1 групп');
    expect(text).toContain('11111111  Кефир · g · 100 ккал · 4600000000017');
    expect(text).toContain('[отклонить] 33333333  ааааа');
    expect(text).toContain('gibberish');
  });
});

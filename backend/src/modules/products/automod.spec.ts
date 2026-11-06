import {
  type AutomodContext,
  energyMismatch,
  estimateKcal,
  moderateSubmission,
  normalizeText,
  sameNutrients,
  type SubmissionInput,
  UNTRUSTED_AFTER_REJECTIONS,
} from './automod.js';

// Гречка: 4·12.6 + 9·3.3 + 4·62.1 = 328.5 ≈ 343 на упаковке — в пределах нормы
const BUCKWHEAT = { kcal: 343, protein: 12.6, fat: 3.3, carbs: 62.1 };
const input = (overrides: Partial<SubmissionInput> = {}): SubmissionInput => ({
  name: 'Гречка ядрица',
  brand: 'Мистраль',
  ...BUCKWHEAT,
  ...overrides,
});
const NO_CONTEXT: AutomodContext = { sameBarcode: null, sameName: null, recentRejections: 0 };
const moderate = (
  overrides: Partial<SubmissionInput> = {},
  context: Partial<AutomodContext> = {},
) => moderateSubmission(input(overrides), { ...NO_CONTEXT, ...context });

describe('автомодерация: обычные продукты принимаются', () => {
  it.each([
    ['гречка', {}],
    ['без бренда', { brand: null }],
    ['вода: всё по нулям', { name: 'Вода питьевая', kcal: 0, protein: 0, fat: 0, carbs: 0 }],
    ['проценты и объём в названии', { name: 'Молоко 3,2% 930 мл' }],
    [
      'латиница в бренде',
      { name: 'Сосиски', brand: "Dickmann's", kcal: 250, protein: 11, fat: 22, carbs: 1 },
    ],
    ['капсом с упаковки', { name: 'ГРЕЧКА ЯДРИЦА' }],
    ['число из нулей', { name: 'Сахар 10000 г' }],
  ])('%s → approve без замечаний', (_name, overrides) => {
    expect(moderate(overrides)).toEqual({ verdict: 'approve', flags: [], duplicateOf: null });
  });

  it.each([
    ['рубля', 'Конфеты по 100 рубля'],
    ['облепиха', 'Облепиха замороженная'],
    ['небанальный', 'Небанальный салат'],
    ['говядина', 'Говядина тушёная'],
    ['оскорбление в слове «оскорбление» нет', 'Сыр «Российский»'],
  ])('слово «%s» не считается матом', (_name, name) => {
    expect(moderate({ name }).flags).not.toContain('banned_words');
  });
});

describe('автомодерация: отклоняется', () => {
  it.each([
    ['мат', 'Гречка хуёвая'],
    ['мат с приставкой', 'Охуенные чипсы'],
    ['мат латинскими буквами', 'Хyй'],
    ['мат с цифрами вместо букв', 'п1зда'],
    ['английский мат', 'Fucking chips'],
  ])('%s → reject banned_words', (_name, name) => {
    const result = moderate({ name });
    expect(result.verdict).toBe('reject');
    expect(result.flags).toContain('banned_words');
  });

  it('мат в бренде тоже', () => {
    expect(moderate({ brand: 'Блядский завод' }).flags).toContain('banned_words');
  });

  it.each([
    ['ссылка', 'Скидки https://example.com'],
    ['домен', 'Заказ на shop.ru'],
    ['телеграм', 'Пишите t.me/seller'],
    ['ник', 'Пишите @seller_bot'],
    ['телефон', 'Звоните +7 (999) 123-45-67'],
  ])('%s → reject link_or_contact', (_name, name) => {
    const result = moderate({ name });
    expect(result.verdict).toBe('reject');
    expect(result.flags).toContain('link_or_contact');
  });

  it.each([
    ['без букв', '12345'],
    ['одна буква', 'Ы'],
    ['повтор одной буквы', 'ааааа'],
    ['знаки', '....'],
  ])('%s → reject gibberish', (_name, name) => {
    expect(moderate({ name })).toMatchObject({ verdict: 'reject', flags: ['gibberish'] });
  });

  it('при отклонении остальные проверки не выполняются и дубль не ищется', () => {
    const result = moderate(
      { name: 'Хуйня', kcal: 0 },
      { sameBarcode: { id: 'p1', ...BUCKWHEAT }, recentRejections: 10 },
    );
    expect(result).toEqual({ verdict: 'reject', flags: ['banned_words'], duplicateOf: null });
  });
});

describe('автомодерация: на проверку человеку', () => {
  it('КБЖУ не сходятся с калорийностью → review energy_mismatch', () => {
    expect(moderate({ kcal: 100 })).toEqual({
      verdict: 'review',
      flags: ['energy_mismatch'],
      duplicateOf: null,
    });
  });

  it('водка: калории без БЖУ — не отклонение, а вопрос человеку', () => {
    expect(moderate({ name: 'Водка', kcal: 235, protein: 0, fat: 0, carbs: 0.1 }).verdict).toBe(
      'review',
    );
  });

  it.each([
    ['растянутая буква', 'Сыыыыр'],
    ['много знаков', 'Лучший сыр!!!'],
  ])('%s → review suspicious_text', (_name, name) => {
    expect(moderate({ name })).toMatchObject({ verdict: 'review', flags: ['suspicious_text'] });
  });

  it('штрихкод уже есть, состав другой → review barcode_conflict', () => {
    const result = moderate({}, { sameBarcode: { id: 'p1', ...BUCKWHEAT, kcal: 400, carbs: 80 } });
    expect(result).toEqual({ verdict: 'review', flags: ['barcode_conflict'], duplicateOf: null });
  });

  it('название + бренд уже есть, состав другой → review name_conflict', () => {
    const result = moderate({}, { sameName: { id: 'p2', ...BUCKWHEAT, protein: 20 } });
    expect(result.flags).toEqual(['name_conflict']);
  });

  it(`${UNTRUSTED_AFTER_REJECTIONS} отклонения автора за неделю → review untrusted_author`, () => {
    expect(moderate({}, { recentRejections: UNTRUSTED_AFTER_REJECTIONS - 1 }).verdict).toBe(
      'approve',
    );
    expect(moderate({}, { recentRejections: UNTRUSTED_AFTER_REJECTIONS })).toMatchObject({
      verdict: 'review',
      flags: ['untrusted_author'],
    });
  });

  it('несколько замечаний — все в flags по порядку проверок', () => {
    const result = moderate(
      { name: 'Сыр!!!', kcal: 50 },
      { sameBarcode: { id: 'p1', ...BUCKWHEAT, fat: 30 }, recentRejections: 5 },
    );
    expect(result.flags).toEqual([
      'suspicious_text',
      'energy_mismatch',
      'barcode_conflict',
      'untrusted_author',
    ]);
  });
});

describe('автомодерация: дубли', () => {
  it('тот же штрихкод, состав близкий → approve, привязка к существующему', () => {
    const result = moderate({ kcal: 340 }, { sameBarcode: { id: 'p1', ...BUCKWHEAT } });
    expect(result).toEqual({ verdict: 'approve', flags: [], duplicateOf: 'p1' });
  });

  it('штрихкод важнее совпадения по названию', () => {
    const result = moderate(
      {},
      {
        sameBarcode: { id: 'by-barcode', ...BUCKWHEAT },
        sameName: { id: 'by-name', ...BUCKWHEAT },
      },
    );
    expect(result.duplicateOf).toBe('by-barcode');
  });

  it('дубль с замечанием — не принимается автоматически', () => {
    const result = moderate({ name: 'Гречка!!!' }, { sameBarcode: { id: 'p1', ...BUCKWHEAT } });
    expect(result).toEqual({ verdict: 'review', flags: ['suspicious_text'], duplicateOf: null });
  });
});

describe('вспомогательные функции', () => {
  it('normalizeText: регистр, похожие латинские буквы и цифры, ё', () => {
    expect(normalizeText('ХyЙ п1здa Ёлка')).toBe('хуй пизда елка');
  });

  it('estimateKcal: 4 / 9 / 4', () => {
    expect(estimateKcal({ protein: 10, fat: 10, carbs: 10 })).toBe(170);
  });

  it('energyMismatch: разница должна быть больше 40 ккал и больше 25 %', () => {
    expect(energyMismatch(BUCKWHEAT)).toBe(false);
    // 30 ккал при оценке 0 — больше 25 %, но меньше 40 ккал (специи, чай)
    expect(energyMismatch({ kcal: 30, protein: 0, fat: 0, carbs: 0 })).toBe(false);
    expect(energyMismatch({ kcal: 500, protein: 10, fat: 10, carbs: 10 })).toBe(true);
  });

  it('sameNutrients: в пределах 10 %', () => {
    expect(sameNutrients(BUCKWHEAT, { ...BUCKWHEAT, kcal: 320 })).toBe(true);
    expect(sameNutrients(BUCKWHEAT, { ...BUCKWHEAT, kcal: 300 })).toBe(false);
    // Малые значения — абсолютный допуск 1 г
    expect(sameNutrients({ ...BUCKWHEAT, fat: 0.5 }, { ...BUCKWHEAT, fat: 1.4 })).toBe(true);
  });
});

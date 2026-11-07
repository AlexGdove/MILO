import {
  decidedCardText,
  fitTelegram,
  idText,
  newTicketText,
  submissionCardText,
  type SubmissionCardData,
} from './texts.js';

const card: SubmissionCardData = {
  name: 'Йогурт',
  brand: 'Простоквашино',
  barcode: '4600000000017',
  unit: 'g',
  pieceWeight: null,
  kcal: 60.5,
  protein: 3,
  fat: 2.5,
  carbs: 4.123,
  flags: ['energy_mismatch'],
  deviceKeyId: '0b6f6c1e-2d3a-4c5b-8e9f-112233445566',
};

describe('texts', () => {
  it('fitTelegram: короткий текст не меняется', () => {
    expect(fitTelegram('привет')).toBe('привет');
  });

  it('fitTelegram: длинный обрезается до лимита с многоточием', () => {
    const r = fitTelegram('я'.repeat(5000));
    expect(Array.from(r)).toHaveLength(4096);
    expect(r.endsWith('…')).toBe(true);
  });

  it('fitTelegram: эмодзи не разрезается пополам', () => {
    expect(fitTelegram('😀'.repeat(10), 5)).toBe('😀😀😀😀…');
  });

  it('новое обращение: номер, текст и подсказка про reply', () => {
    const t = newTicketText(42, 'Не сохраняется');
    expect(t.startsWith('🆘 Обращение № 42\n\nНе сохраняется')).toBe(true);
    expect(t).toContain('reply');
  });

  it('новое обращение: длинный текст укладывается в лимит', () => {
    const t = newTicketText(1, 'а'.repeat(4000) + 'б'.repeat(500));
    expect(Array.from(t).length).toBeLessThanOrEqual(4096);
  });

  it('idText: с пользователем и без', () => {
    expect(idText(-100123, 777)).toBe('ID чата: -100123\nВаш Telegram ID: 777');
    expect(idText(-100123)).toBe('ID чата: -100123');
  });

  it('idText: в теме — ещё и номер темы', () => {
    expect(idText(-100123, 777, 5)).toBe('ID чата: -100123\nID темы: 5\nВаш Telegram ID: 777');
  });

  it('карточка продукта: все поля', () => {
    expect(submissionCardText(card)).toBe(
      '🥫 Новый продукт на проверку\n\nЙогурт\nБренд: Простоквашино\nШтрихкод: 4600000000017\n' +
        'Единица: г\nНа 100 г: 60,5 ккал · Б 3 · Ж 2,5 · У 4,12\n' +
        'Замечания: калории не сходятся с БЖУ\nУстройство: 0b6f6c1e',
    );
  });

  it('карточка продукта: штучный продукт без бренда, штрихкода и замечаний', () => {
    expect(
      submissionCardText({
        ...card,
        brand: null,
        barcode: null,
        unit: 'pcs',
        pieceWeight: 55,
        flags: [],
      }),
    ).toBe(
      '🥫 Новый продукт на проверку\n\nЙогурт\nЕдиница: шт (1 шт = 55 г)\n' +
        'На 100 г: 60,5 ккал · Б 3 · Ж 2,5 · У 4,12\nУстройство: 0b6f6c1e',
    );
  });

  it('карточка продукта: неизвестный код замечания — как есть', () => {
    expect(submissionCardText({ ...card, flags: ['new_code'] })).toContain('Замечания: new_code');
  });

  it('решение: итог и оператор под карточкой', () => {
    expect(decidedCardText('Карточка', 'approved', 'Анна')).toBe('Карточка\n\n✅ Принято — Анна');
    expect(decidedCardText('Карточка', 'blocked', 'Анна')).toBe(
      'Карточка\n\n🚫 Отклонено, устройство заблокировано — Анна',
    );
  });
});

import {
  MAX_GRAMS,
  MAX_INGREDIENTS,
  MAX_NAME_LENGTH,
  parseRecognition,
} from './recognition-parser.js';

const withGrams = (grams: unknown): string =>
  JSON.stringify({ dish: 'Тест', ingredients: [{ name: 'А', grams }] });

describe('parseRecognition', () => {
  it('разбирает чистый JSON', () => {
    const input = '{"dish":"Салат","ingredients":[{"name":"огурец","grams":100}]}';
    expect(parseRecognition(input)).toEqual({
      dish: 'Салат',
      ingredients: [{ name: 'огурец', grams: 100 }],
    });
  });

  it('достаёт JSON из ограждения ```json с текстом до и после', () => {
    const input = 'Вот ответ:\n```json\n{"dish":"Суп","ingredients":[]}\n```\nГотово';
    expect(parseRecognition(input)).toEqual({ dish: 'Суп', ingredients: [] });
  });

  it('возвращает null для текста, который не JSON', () => {
    expect(parseRecognition('{это не json}')).toBeNull();
  });

  it('возвращает null для строки без фигурных скобок', () => {
    expect(parseRecognition('на фото суп')).toBeNull();
  });

  it('возвращает null для массива на верхнем уровне', () => {
    expect(parseRecognition('[1,2]')).toBeNull();
    expect(parseRecognition('[{"dish":"Суп"}]')).toEqual({ dish: 'Суп', ingredients: [] });
  });

  it('принимает «не еда»: dish null и пустые ингредиенты', () => {
    expect(parseRecognition('{"dish":null,"ingredients":[]}')).toEqual({
      dish: null,
      ingredients: [],
    });
  });

  it('название блюда из пробелов считает отсутствующим', () => {
    expect(parseRecognition('{"dish":"   ","ingredients":[]}')?.dish).toBeNull();
  });

  it('обрезает длинное название блюда и ингредиента', () => {
    const long = 'а'.repeat(MAX_NAME_LENGTH + 10);
    const result = parseRecognition(
      JSON.stringify({ dish: long, ingredients: [{ name: ` ${long} `, grams: 10 }] }),
    );
    expect(result?.dish).toHaveLength(MAX_NAME_LENGTH);
    expect(result?.ingredients[0]?.name).toHaveLength(MAX_NAME_LENGTH);
  });

  it('ingredients не массивом считает пустым списком', () => {
    expect(parseRecognition('{"dish":"Блюдо","ingredients":"рис"}')).toEqual({
      dish: 'Блюдо',
      ingredients: [],
    });
  });

  it('пропускает негодные ингредиенты', () => {
    const input = JSON.stringify({
      dish: 'Тест',
      ingredients: [
        { name: '', grams: 100 },
        { grams: 100 },
        { name: 'ноль', grams: 0 },
        { name: 'минус', grams: -5 },
        { name: 'не число', grams: 'abc' },
        { name: 'пусто', grams: null },
        { name: 5, grams: 100 },
        42,
        null,
        { name: 'рис', grams: 150 },
      ],
    });
    expect(parseRecognition(input)?.ingredients).toEqual([{ name: 'рис', grams: 150 }]);
  });

  it('принимает граммы строкой', () => {
    expect(parseRecognition(withGrams('150'))?.ingredients).toEqual([{ name: 'А', grams: 150 }]);
  });

  it('округляет граммы до целого', () => {
    expect(parseRecognition(withGrams(149.6))?.ingredients[0]?.grams).toBe(150);
  });

  it('ограничивает граммы сверху и снизу', () => {
    expect(parseRecognition(withGrams(99999))?.ingredients[0]?.grams).toBe(MAX_GRAMS);
    expect(parseRecognition(withGrams(0.2))?.ingredients[0]?.grams).toBe(1);
  });

  it('берёт не больше MAX_INGREDIENTS первых годных ингредиентов', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({ name: `Продукт${i}`, grams: 100 }));
    const result = parseRecognition(JSON.stringify({ dish: 'Тест', ingredients: items }));
    expect(result?.ingredients).toHaveLength(MAX_INGREDIENTS);
    expect(result?.ingredients[0]?.name).toBe('Продукт0');
    expect(result?.ingredients[MAX_INGREDIENTS - 1]?.name).toBe('Продукт19');
  });

  it('не переносит в результат лишние поля', () => {
    const input =
      '{"dish":"Тест","confidence":0.9,"total_grams":500,"ingredients":[{"name":"рис","grams":1,"kcal":999}]}';
    expect(parseRecognition(input)).toEqual({
      dish: 'Тест',
      ingredients: [{ name: 'рис', grams: 1 }],
    });
  });
});

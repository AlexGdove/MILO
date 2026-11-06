import { stableStringify } from './stable-stringify.js';

describe('stableStringify', () => {
  it('сортирует ключи объектов по алфавиту', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });

  it('корректно обрабатывает вложенные объекты и массивы', () => {
    expect(stableStringify({ z: { y: 1, x: 2 }, a: [{ d: 1, c: 2 }] })).toBe(
      '{"a":[{"c":2,"d":1}],"z":{"x":2,"y":1}}',
    );
  });

  it('сохраняет порядок элементов массивов', () => {
    expect(stableStringify([3, 1, 2])).toBe('[3,1,2]');
  });

  it('выкидывает значения undefined', () => {
    expect(stableStringify({ a: 1, b: undefined })).toBe('{"a":1}');
  });

  it('дает одинаковый результат для объектов с разным порядком ключей', () => {
    expect(stableStringify({ name: 'Суп', servings: 2 })).toBe(
      stableStringify({ servings: 2, name: 'Суп' }),
    );
  });
});

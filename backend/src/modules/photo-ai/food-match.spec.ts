import { matchFood, normalizeFoodName } from './food-match.js';
import type { ReferenceFood } from './food-reference.js';

const per100g = { kcal: 100, protein: 1, fat: 1, carbs: 1 };

// Небольшой справочник для изолированных тестов
const FOODS: readonly ReferenceFood[] = [
  { name: 'гречка отварная', aliases: ['гречка', 'гречневая каша', 'греча'], per100g },
  {
    name: 'куриная грудка отварная',
    aliases: ['куриное филе', 'куриная грудка', 'филе'],
    per100g,
  },
  { name: 'яйцо куриное', aliases: ['яйцо', 'яйца', 'яйцо вареное'], per100g },
  { name: 'масло сливочное', aliases: ['сливочное масло'], per100g },
  {
    name: 'масло растительное',
    aliases: ['подсолнечное масло', 'масло подсолнечное', 'масло'],
    per100g,
  },
  { name: 'картофель фри', aliases: ['фри', 'картошка фри'], per100g },
  {
    name: 'картофель отварной',
    aliases: ['картофель', 'картошка', 'вареный картофель'],
    per100g,
  },
  { name: 'свёкла отварная', aliases: ['свекла'], per100g },
  { name: 'гороховый суп', aliases: [], per100g },
  { name: 'суп гороховый с копчёностями', aliases: [], per100g },
];

describe('normalizeFoodName', () => {
  it('приводит к нижнему регистру', () => {
    expect(normalizeFoodName('ГРЕЧКА')).toBe('гречка');
  });

  it('заменяет ё на е', () => {
    expect(normalizeFoodName('свёкла')).toBe('свекла');
    expect(normalizeFoodName('Ёжик в тумане')).toBe('ежик в тумане');
  });

  it('удаляет текст в круглых скобках', () => {
    expect(normalizeFoodName('яйцо куриное (жареное)')).toBe('яйцо куриное');
    expect(normalizeFoodName('(только скобки)')).toBe('');
  });

  it('заменяет знаки препинания пробелами, а процент оставляет', () => {
    expect(normalizeFoodName('масло-сливочное')).toBe('масло сливочное');
    expect(normalizeFoodName('яйцо, куриное')).toBe('яйцо куриное');
    expect(normalizeFoodName('Творог 5%')).toBe('творог 5%');
  });

  it('схлопывает и обрезает пробелы', () => {
    expect(normalizeFoodName('   гречка     отварная   ')).toBe('гречка отварная');
    expect(normalizeFoodName('   ')).toBe('');
  });
});

describe('matchFood', () => {
  it('находит запись по точному названию', () => {
    expect(matchFood('Гречка отварная', FOODS)?.name).toBe('гречка отварная');
  });

  it('находит запись по синониму', () => {
    expect(matchFood('гречка', FOODS)?.name).toBe('гречка отварная');
    expect(matchFood('куриное филе', FOODS)?.name).toBe('куриная грудка отварная');
    expect(matchFood('Свёкла', FOODS)?.name).toBe('свёкла отварная');
  });

  it('название важнее синонима: «масло сливочное» не попадает в синоним «масло»', () => {
    expect(matchFood('масло сливочное', FOODS)?.name).toBe('масло сливочное');
    expect(matchFood('масло', FOODS)?.name).toBe('масло растительное');
  });

  it('находит запись, все слова которой есть в запросе', () => {
    expect(matchFood('Яйцо куриное (жареное)', FOODS)?.name).toBe('яйцо куриное');
    expect(matchFood('яйцо куриное жареное', FOODS)?.name).toBe('яйцо куриное');
  });

  it('из подходящих по словам выбирает самое длинное совпадение', () => {
    // «картофель» — синоним отварного, но «картофель фри» совпадает двумя словами
    expect(matchFood('картофель фри с солью', FOODS)?.name).toBe('картофель фри');
  });

  it('находит запись, название которой содержит все слова запроса, — самую короткую', () => {
    expect(matchFood('гороховый', FOODS)?.name).toBe('гороховый суп');
    expect(matchFood('отварная', FOODS)?.name).toBe('гречка отварная');
  });

  it('возвращает null для пустой строки и неизвестного продукта', () => {
    expect(matchFood('', FOODS)).toBeNull();
    expect(matchFood('  (…)  ', FOODS)).toBeNull();
    expect(matchFood('блюдо, которого нет в справочнике xyz', FOODS)).toBeNull();
  });

  it('по умолчанию ищет в настоящем справочнике', () => {
    expect(matchFood('гречка')?.name).toBe('гречка отварная');
    expect(matchFood('Куриное филе')?.name).toBe('куриная грудка отварная');
    expect(matchFood('картофель фри')?.name).toBe('картофель фри');
    expect(matchFood('xyz неизвестный продукт')).toBeNull();
  });
});

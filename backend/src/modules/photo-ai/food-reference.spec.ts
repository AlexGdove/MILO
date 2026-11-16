import { normalizeFoodName } from './food-match.js';
import { FOOD_REFERENCE, FOOD_REFERENCE_NAMES } from './food-reference.js';

describe('Справочник продуктов для фото-ИИ', () => {
  it('содержит не меньше 100 записей', () => {
    expect(FOOD_REFERENCE.length).toBeGreaterThanOrEqual(100);
  });

  it('названия уникальны после нормализации', () => {
    const names = FOOD_REFERENCE.map((food) => normalizeFoodName(food.name));
    expect(new Set(names).size).toBe(names.length);
  });

  it('синонимы не совпадают с названиями других записей и не повторяются', () => {
    const problems: string[] = [];
    const owners = new Map(FOOD_REFERENCE.map((food) => [normalizeFoodName(food.name), food.name]));
    const aliasOwners = new Map<string, string>();

    for (const food of FOOD_REFERENCE) {
      for (const alias of food.aliases) {
        const key = normalizeFoodName(alias);
        const nameOwner = owners.get(key);
        if (nameOwner !== undefined && nameOwner !== food.name) {
          problems.push(`«${alias}» (${food.name}) — это название записи «${nameOwner}»`);
        }
        const aliasOwner = aliasOwners.get(key);
        if (aliasOwner !== undefined && aliasOwner !== food.name) {
          problems.push(`«${alias}» есть и у «${aliasOwner}», и у «${food.name}»`);
        }
        aliasOwners.set(key, food.name);
      }
    }
    expect(problems).toEqual([]);
  });

  it('значения КБЖУ — числа в допустимых пределах', () => {
    const problems: string[] = [];
    for (const food of FOOD_REFERENCE) {
      const { kcal, protein, fat, carbs } = food.per100g;
      if (![kcal, protein, fat, carbs].every(Number.isFinite)) {
        problems.push(`${food.name}: не число`);
        continue;
      }
      if (kcal <= 0) problems.push(`${food.name}: ккал ≤ 0`);
      if ([protein, fat, carbs].some((value) => value < 0 || value > 100)) {
        problems.push(`${food.name}: БЖУ вне 0…100`);
      }
      if (protein + fat + carbs > 100.5) problems.push(`${food.name}: сумма БЖУ больше 100 г`);
    }
    expect(problems).toEqual([]);
  });

  it('калории согласованы с БЖУ (4·Б + 9·Ж + 4·У)', () => {
    const problems: string[] = [];
    for (const food of FOOD_REFERENCE) {
      const { kcal, protein, fat, carbs } = food.per100g;
      const expected = 4 * protein + 9 * fat + 4 * carbs;
      if (Math.abs(kcal - expected) > Math.max(12, 0.12 * kcal)) {
        problems.push(`${food.name}: ${kcal} vs ${expected.toFixed(0)}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('список названий для запроса совпадает со справочником', () => {
    expect(FOOD_REFERENCE_NAMES).toEqual(FOOD_REFERENCE.map((food) => food.name));
  });
});

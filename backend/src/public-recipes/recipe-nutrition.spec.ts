import {
  perServingNutrition,
  roundTo2,
  toGrams,
  type IngredientSnapshot,
} from './recipe-nutrition.js';

const grams = (
  amount: number,
  per100g: IngredientSnapshot['per100g'],
  unit: 'g' | 'ml' = 'g',
): IngredientSnapshot => ({ amount, unit, pieceWeight: null, per100g });

describe('toGrams', () => {
  it('граммы и миллилитры — как есть (мл ≈ г)', () => {
    expect(toGrams(150, 'g', null)).toBe(150);
    expect(toGrams(200, 'ml', null)).toBe(200);
  });

  it('штуки — умножаются на вес штуки', () => {
    expect(toGrams(2, 'pcs', 55)).toBe(110);
  });

  it('штуки без веса штуки — 0', () => {
    expect(toGrams(3, 'pcs', null)).toBe(0);
    expect(toGrams(3, 'pcs', 0)).toBe(0);
  });
});

describe('roundTo2', () => {
  it('округляет до сотых', () => {
    expect(roundTo2(12.345678)).toBe(12.35);
    expect(roundTo2(7)).toBe(7);
  });
});

describe('perServingNutrition', () => {
  it('КБЖУ порции: граммы и штуки, две порции', () => {
    const ingredients: IngredientSnapshot[] = [
      grams(200, { kcal: 100, protein: 10, fat: 5, carbs: 20 }),
      {
        amount: 2,
        unit: 'pcs',
        pieceWeight: 50,
        per100g: { kcal: 150, protein: 12, fat: 10, carbs: 1 },
      },
    ];
    expect(perServingNutrition(ingredients, 2)).toEqual({
      kcal: 175,
      protein: 16,
      fat: 10,
      carbs: 20.5,
    });
  });

  it('штучный ингредиент без веса штуки не учитывается', () => {
    const ingredients: IngredientSnapshot[] = [
      grams(100, { kcal: 50, protein: 1, fat: 1, carbs: 1 }),
      {
        amount: 3,
        unit: 'pcs',
        pieceWeight: null,
        per100g: { kcal: 500, protein: 50, fat: 50, carbs: 0 },
      },
    ];
    expect(perServingNutrition(ingredients, 1)).toEqual({ kcal: 50, protein: 1, fat: 1, carbs: 1 });
  });

  it('0 порций считается как 1', () => {
    const milk = grams(100, { kcal: 60, protein: 3, fat: 3.2, carbs: 4.7 }, 'ml');
    expect(perServingNutrition([milk], 0)).toEqual({ kcal: 60, protein: 3, fat: 3.2, carbs: 4.7 });
  });

  it('пустой список — нули', () => {
    expect(perServingNutrition([], 1)).toEqual({ kcal: 0, protein: 0, fat: 0, carbs: 0 });
  });

  it('округление только в конце: мелкие вклады не теряются', () => {
    // Каждый ингредиент даёт 0.004 ккал: при округлении по шагам вышло бы 0
    const tiny = grams(1, { kcal: 0.4, protein: 0, fat: 0, carbs: 0 });
    expect(perServingNutrition([tiny, tiny, tiny], 1).kcal).toBe(0.01);
  });
});

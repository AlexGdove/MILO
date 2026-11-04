/** Пищевая ценность: калории и БЖУ. */
export interface Nutrients {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export const EMPTY_NUTRIENTS: Nutrients = { kcal: 0, protein: 0, fat: 0, carbs: 0 };

/** Пересчёт значений «на 100 г» на указанную массу. */
export const nutrientsForGrams = (per100g: Nutrients, grams: number): Nutrients => {
  const factor = grams / 100;
  return {
    kcal: per100g.kcal * factor,
    protein: per100g.protein * factor,
    fat: per100g.fat * factor,
    carbs: per100g.carbs * factor,
  };
};

export const sumNutrients = (items: Nutrients[]): Nutrients =>
  items.reduce<Nutrients>(
    (total, item) => ({
      kcal: total.kcal + item.kcal,
      protein: total.protein + item.protein,
      fat: total.fat + item.fat,
      carbs: total.carbs + item.carbs,
    }),
    { ...EMPTY_NUTRIENTS },
  );

/** Округление для отображения: ккал — до целого, граммы — до 0.1. */
export const formatKcal = (value: number) => String(Math.round(value));
export const formatGrams = (value: number) => (Math.round(value * 10) / 10).toLocaleString('ru-RU');

import { beforeEach, describe, expect, it } from 'vitest';

import { selectCookedDishes, useCookedDishStore } from './store';
import type { CookedDishDraft } from './types';

const draft: CookedDishDraft = {
  recipeId: 'r1',
  name: 'Суп',
  servingsTotal: 6,
  portionGrams: 300,
  per100g: { kcal: 40, protein: 2, fat: 1, carbs: 5 },
};

const state = () => useCookedDishStore.getState();
const dish = (id: string) => selectCookedDishes(state()).find((d) => d.id === id);

beforeEach(() => {
  useCookedDishStore.setState(useCookedDishStore.getInitialState(), true);
});

describe('useCookedDishStore', () => {
  it('новое блюдо — все порции на месте, сверху списка', () => {
    state().addDish({ ...draft, name: 'Старое' });
    const created = state().addDish(draft);
    expect(created).toMatchObject({ ...draft, servingsLeft: 6 });
    expect(state().dishes[0]?.id).toBe(created.id);
  });

  it('сварил 6, съел 2 — осталось 4; больше остатка не съесть', () => {
    const { id } = state().addDish(draft);
    expect(state().eatPortions(id, 2)).toBe(2);
    expect(dish(id)?.servingsLeft).toBe(4);
    expect(state().eatPortions(id, 10)).toBe(4);
    expect(dish(id)?.servingsLeft).toBe(0);
    expect(state().eatPortions(id, 1)).toBe(0);
  });

  it('возврат порций не превышает приготовленное', () => {
    const { id } = state().addDish(draft);
    state().eatPortions(id, 3);
    state().returnPortions(id, 10);
    expect(dish(id)?.servingsLeft).toBe(6);
  });

  it('«убрать остаток» обнуляет порции, но блюдо остаётся для истории', () => {
    const { id } = state().addDish(draft);
    state().discardRest(id);
    expect(dish(id)).toMatchObject({ servingsLeft: 0, servingsTotal: 6 });
  });

  it('дробные порции (съели в граммах): списываются и возвращаются точно', () => {
    const { id } = state().addDish(draft);
    // 150 г при порции 300 г — полпорции
    expect(state().eatPortions(id, 0.5)).toBe(0.5);
    expect(dish(id)?.servingsLeft).toBe(5.5);
    state().returnPortions(id, 0.5);
    expect(dish(id)?.servingsLeft).toBe(6);
  });

  it('дробь округляется до 0.001 порции, без накопления погрешности', () => {
    const { id } = state().addDish(draft);
    for (let i = 0; i < 3; i++) state().eatPortions(id, 0.1);
    expect(dish(id)?.servingsLeft).toBe(5.7);
    expect(state().eatPortions(id, 1 / 3)).toBe(0.333);
  });

  it('крошечный остаток (меньше 0.01 порции) считается съеденным', () => {
    const { id } = state().addDish({ ...draft, servingsTotal: 1 });
    state().eatPortions(id, 0.995);
    expect(dish(id)?.servingsLeft).toBe(0);
  });

  it('неизвестное блюдо: съесть 0', () => {
    expect(state().eatPortions('nope', 1)).toBe(0);
  });
});

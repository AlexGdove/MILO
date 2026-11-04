import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useMealEntryStore } from '@/entities/meal-entry';
import { selectProductById, useProductStore } from '@/entities/product';

import { AddMealEntryForm } from './AddMealEntryForm';

const DATE = '2026-11-04';

const addCheesecakes = (stock: number) =>
  useProductStore.getState().addProduct({
    name: 'Сырники',
    per100g: { kcal: 220, protein: 15.5, fat: 9, carbs: 20 },
    stock,
  });

const renderForm = () => {
  const onDone = vi.fn();
  render(<AddMealEntryForm date={DATE} initialMealType="lunch" onDone={onDone} />);
  return { onDone };
};

const pickCheesecakes = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByRole('searchbox', { name: 'Найти продукт' }), 'сыр');
  await user.click(screen.getByRole('button', { name: /Сырники/ }));
};

beforeEach(() => {
  useProductStore.setState(useProductStore.getInitialState(), true);
  useMealEntryStore.setState(useMealEntryStore.getInitialState(), true);
});

describe('AddMealEntryForm', () => {
  it('ищет продукт и показывает расчёт КБЖУ для введённого веса', async () => {
    const user = userEvent.setup();
    addCheesecakes(0);
    renderForm();

    await pickCheesecakes(user);
    const weight = screen.getByLabelText('Вес, г');
    await user.clear(weight);
    await user.type(weight, '200');

    expect(screen.getByText('440 ккал')).toBeInTheDocument();
    expect(screen.getByText(/Б 31 · Ж 18 · У 40/)).toBeInTheDocument();
  });

  it('добавляет запись в дневник и списывает вес с остатка', async () => {
    const user = userEvent.setup();
    const product = addCheesecakes(500);
    const { onDone } = renderForm();

    await pickCheesecakes(user);
    expect(screen.getByRole('checkbox', { name: /Списать с остатков/ })).toBeChecked();
    await user.clear(screen.getByLabelText('Вес, г'));
    await user.type(screen.getByLabelText('Вес, г'), '200');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    const [entry] = useMealEntryStore.getState().entries;
    expect(entry).toMatchObject({
      date: DATE,
      mealType: 'lunch',
      productId: product.id,
      productName: 'Сырники',
      grams: 200,
      stockDeducted: 200,
    });
    expect(selectProductById(product.id)(useProductStore.getState())?.stock).toBe(300);
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('списывает не больше, чем есть в наличии', async () => {
    const user = userEvent.setup();
    const product = addCheesecakes(150);
    renderForm();

    await pickCheesecakes(user);
    await user.clear(screen.getByLabelText('Вес, г'));
    await user.type(screen.getByLabelText('Вес, г'), '200');
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(useMealEntryStore.getState().entries[0]?.stockDeducted).toBe(150);
    expect(selectProductById(product.id)(useProductStore.getState())?.stock).toBe(0);
  });

  it('не трогает остаток, если пользователь снял галочку списания', async () => {
    const user = userEvent.setup();
    const product = addCheesecakes(500);
    renderForm();

    await pickCheesecakes(user);
    await user.click(screen.getByRole('checkbox', { name: /Списать с остатков/ }));
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(useMealEntryStore.getState().entries[0]?.stockDeducted).toBe(0);
    expect(selectProductById(product.id)(useProductStore.getState())?.stock).toBe(500);
  });

  it('учитывает выбранный приём пищи', async () => {
    const user = userEvent.setup();
    addCheesecakes(0);
    renderForm();

    await pickCheesecakes(user);
    await user.click(screen.getByRole('radio', { name: 'Ужин' }));
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    expect(useMealEntryStore.getState().entries[0]?.mealType).toBe('dinner');
  });

  it('блокирует добавление при некорректном весе', async () => {
    const user = userEvent.setup();
    addCheesecakes(0);
    const { onDone } = renderForm();

    await pickCheesecakes(user);
    await user.clear(screen.getByLabelText('Вес, г'));
    await user.type(screen.getByLabelText('Вес, г'), '0');

    expect(screen.getByText('Введите вес больше 0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled();
    expect(useMealEntryStore.getState().entries).toEqual([]);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('сообщает, если продукт не найден', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByRole('searchbox', { name: 'Найти продукт' }), 'ананас');

    expect(screen.getByText(/Продукт не найден/)).toBeInTheDocument();
  });
});

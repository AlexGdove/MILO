import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useSessionStore, type Plan } from '@/entities/account';
import { useMealEntryStore } from '@/entities/meal-entry';
import { useProductStore } from '@/entities/product';
import { ApiError } from '@/shared/api';

import { PhotoEntryForm } from './PhotoEntryForm';
import type * as photoAiApiModule from '../api/photoAiApi';
import type { Recognition } from '../lib/photoDish';

const { recognize } = vi.hoisted(() => ({
  recognize: vi.fn<(token: string, image: string, hint: string) => Promise<Recognition>>(),
}));

vi.mock('../api/photoAiApi', async (importOriginal) => {
  const actual = await importOriginal<typeof photoAiApiModule>();
  return { ...actual, photoAiApi: { recognize } };
});

const DATE = '2026-11-16';
const TOKEN = `ms_${'a'.repeat(43)}`;

const RECOGNITION: Recognition = {
  dish: 'Гречневая каша с маслом',
  ingredients: [
    {
      name: 'гречка отварная',
      grams: 200,
      matchedName: 'гречка отварная',
      per100g: { kcal: 110, protein: 4.2, fat: 1.1, carbs: 21 },
    },
    {
      name: 'масло сливочное',
      grams: 10,
      matchedName: 'масло сливочное',
      per100g: { kcal: 748, protein: 0.5, fat: 82.5, carbs: 0.8 },
    },
  ],
  usage: { used: 3, limit: 20 },
};

const UNKNOWN: Recognition = {
  dish: 'Марсианское блюдо',
  ingredients: [{ name: 'марсианский соус', grams: 30, matchedName: null, per100g: null }],
  usage: { used: null, limit: null },
};

const signIn = (plan: Plan) =>
  useSessionStore.getState().signIn({
    token: TOKEN,
    account: { id: 'acc-1', email: 'anna@example.com', plan, planUntil: null },
  });

const renderForm = () => {
  const onDone = vi.fn();
  const onChangeSource = vi.fn();
  const encodePhoto = vi.fn<(file: Blob) => Promise<string>>().mockResolvedValue('BASE64');
  render(
    <PhotoEntryForm
      date={DATE}
      initialMealType="lunch"
      onDone={onDone}
      onChangeSource={onChangeSource}
      encodePhoto={encodePhoto}
    />,
  );
  return { onDone, onChangeSource, encodePhoto };
};

const PHOTO = new File(['x'], 'food.jpg', { type: 'image/jpeg' });

/** Выбрать фото и нажать «Распознать». */
const recognizePhoto = async (user: ReturnType<typeof userEvent.setup>, hint = '') => {
  await user.upload(screen.getByLabelText('Фото из галереи'), PHOTO);
  if (hint) await user.type(screen.getByLabelText('Описание (необязательно)'), hint);
  await user.click(screen.getByRole('button', { name: 'Распознать' }));
};

/** Дойти до шага проверки с заданным ответом сервера. */
const openReview = async (recognition: Recognition = RECOGNITION) => {
  const user = userEvent.setup();
  signIn('plus');
  recognize.mockResolvedValue(recognition);
  const props = renderForm();
  await recognizePhoto(user);
  await screen.findByRole('list', { name: 'Ингредиенты' });
  return { user, ...props };
};

const rows = () =>
  within(screen.getByRole('list', { name: 'Ингредиенты' })).getAllByRole('listitem');

beforeEach(() => {
  recognize.mockReset();
  useSessionStore.setState(useSessionStore.getInitialState(), true);
  useProductStore.setState(useProductStore.getInitialState(), true);
  useMealEntryStore.setState(useMealEntryStore.getInitialState(), true);
});

describe('PhotoEntryForm', () => {
  it('без входа: объясняет, что нужен аккаунт, и возвращает к поиску', async () => {
    const user = userEvent.setup();
    const { onChangeSource } = renderForm();

    expect(screen.queryByLabelText('Фото из галереи')).not.toBeInTheDocument();
    expect(screen.getByText(/доступно после входа в аккаунт/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '← К поиску' }));
    expect(onChangeSource).toHaveBeenCalledOnce();
  });

  it('бесплатный тариф: объясняет, что нужен платный', () => {
    signIn('free');
    renderForm();

    expect(screen.queryByLabelText('Фото из галереи')).not.toBeInTheDocument();
    expect(screen.getByText(/доступно на платном тарифе/)).toBeInTheDocument();
  });

  it.each<Plan>(['plus', 'unlimited'])(
    'тариф %s: выбор фото, «Распознать» выключена до выбора файла',
    async (plan) => {
      const user = userEvent.setup();
      signIn(plan);
      renderForm();

      expect(screen.getByLabelText('Описание (необязательно)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Распознать' })).toBeDisabled();
      await user.upload(screen.getByLabelText('Фото из галереи'), PHOTO);
      expect(screen.getByRole('button', { name: 'Распознать' })).toBeEnabled();
    },
  );

  it('две кнопки: «Сделать фото» и «Выбрать из галереи»; после выбора — «Переснять»', async () => {
    const user = userEvent.setup();
    signIn('plus');
    renderForm();

    expect(screen.getByRole('button', { name: 'Сделать фото' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Выбрать из галереи' })).toBeInTheDocument();
    await user.upload(screen.getByLabelText('Фото из галереи'), PHOTO);
    expect(screen.getByRole('button', { name: 'Переснять' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Другое из галереи' })).toBeInTheDocument();
  });

  // Регрессия (2026-11-16): с accept="image/*" Android вместо галереи предлагал «Камера / Файлы»
  it('галерея принимает конкретные форматы, а не image/*', () => {
    signIn('plus');
    renderForm();

    expect(screen.getByLabelText('Фото из галереи')).toHaveAttribute(
      'accept',
      'image/jpeg,image/png,image/webp',
    );
  });

  it('«Сделать фото» открывает камеру в приложении, «Назад» возвращает к выбору', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    signIn('plus');
    renderForm();

    await user.click(screen.getByRole('button', { name: 'Сделать фото' }));
    expect(screen.getByRole('button', { name: 'Снять' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Распознать' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Назад' }));
    expect(screen.getByRole('button', { name: 'Распознать' })).toBeInTheDocument();
  });

  it('отправляет на сервер сжатое фото и описание', async () => {
    const user = userEvent.setup();
    signIn('plus');
    recognize.mockResolvedValue(RECOGNITION);
    const { encodePhoto } = renderForm();
    await recognizePhoto(user, 'пельмени');

    await screen.findByRole('list', { name: 'Ингредиенты' });
    expect(encodePhoto).toHaveBeenCalledWith(PHOTO);
    expect(recognize).toHaveBeenCalledWith(TOKEN, 'BASE64', 'пельмени');
  });

  it('пока идёт запрос, показывает «Распознаём» и не даёт отправить снова', async () => {
    const user = userEvent.setup();
    signIn('plus');
    recognize.mockReturnValue(new Promise(() => undefined));
    renderForm();
    await recognizePhoto(user);

    expect(await screen.findByRole('status')).toHaveTextContent(/Распознаём/);
    expect(screen.getByRole('button', { name: 'Распознаём…' })).toBeDisabled();
  });

  it.each([
    [
      new ApiError(429, 'photo_ai_limit', 'x'),
      'Лимит распознаваний на сегодня исчерпан — попробуйте завтра',
    ],
    [
      new ApiError(422, 'photo_no_food', 'x'),
      'На фото не видно еды — попробуйте другой снимок или опишите блюдо',
    ],
    [new Error('boom'), 'Не получилось распознать фото — попробуйте ещё раз'],
  ])('ошибка запроса: возвращает к выбору фото с понятным текстом', async (error, text) => {
    const user = userEvent.setup();
    signIn('plus');
    recognize.mockRejectedValue(error);
    renderForm();
    await recognizePhoto(user);

    expect(await screen.findByRole('alert')).toHaveTextContent(text);
    expect(screen.getByRole('button', { name: 'Распознать' })).toBeEnabled();
  });

  it('показывает блюдо, ингредиенты с весом, итог и расход лимита', async () => {
    await openReview();

    expect(screen.getByLabelText('Блюдо')).toHaveValue('Гречневая каша с маслом');
    expect(rows()).toHaveLength(2);
    expect(screen.getByLabelText('Вес, г: гречка отварная')).toHaveValue('200');
    expect(screen.getByLabelText('Вес, г: масло сливочное')).toHaveValue('10');
    expect(screen.getByRole('button', { name: 'Убрать гречка отварная' })).toBeInTheDocument();
    // 200 г гречки (220 ккал) + 10 г масла (74,8 ккал)
    expect(screen.getByText('295 ккал')).toBeInTheDocument();
    expect(screen.getByText('Распознаваний за сутки: 3 из 20')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeEnabled();
  });

  it('правка веса пересчитывает итог', async () => {
    const { user } = await openReview();
    const weight = screen.getByLabelText('Вес, г: гречка отварная');
    await user.clear(weight);
    await user.type(weight, '100');

    expect(screen.getByText('185 ккал')).toBeInTheDocument();
  });

  it('пустой вес: ошибка у поля, «Добавить» выключена', async () => {
    const { user } = await openReview();
    await user.clear(screen.getByLabelText('Вес, г: гречка отварная'));

    expect(screen.getByText('Вес больше 0')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled();
  });

  it('«×» убирает ингредиент и пересчитывает итог', async () => {
    const { user } = await openReview();
    await user.click(screen.getByRole('button', { name: 'Убрать масло сливочное' }));

    expect(rows()).toHaveLength(1);
    expect(screen.getByText('220 ккал')).toBeInTheDocument();
  });

  it('«Добавить» записывает блюдо одной записью без списания остатков', async () => {
    const { user, onDone } = await openReview();
    await user.click(screen.getByRole('button', { name: 'Добавить' }));

    const entries = useMealEntryStore.getState().entries;
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      date: DATE,
      mealType: 'lunch',
      productName: 'Гречневая каша с маслом',
      unit: 'g',
      grams: 210,
      amount: 210,
      stockDeducted: 0,
    });
    expect(entries[0]?.source.type).toBe('photo');
    expect(entries[0]?.per100g.kcal).toBeCloseTo(140.38, 1);
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('продукт не из справочника: просит выбрать свой, «Добавить» выключена', async () => {
    await openReview(UNKNOWN);

    expect(screen.getByText('нет в справочнике')).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Продукт для «марсианский соус»' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/выберите свой продукт/);
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled();
  });

  it('после выбора своего продукта блюдо можно записать с его КБЖУ', async () => {
    useProductStore.getState().addProduct({
      name: 'Соус особый',
      per100g: { kcal: 200, protein: 1, fat: 20, carbs: 5 },
      unit: 'g',
      stock: 0,
      minStock: 0,
    });
    const { user } = await openReview(UNKNOWN);
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Продукт для «марсианский соус»' }),
      'Соус особый',
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // 30 г при 200 ккал на 100 г
    expect(screen.getByText('60 ккал')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Добавить' }));
    expect(useMealEntryStore.getState().entries[0]?.per100g.kcal).toBeCloseTo(200);
  });

  it('продукт не из справочника можно убрать — тогда блюда не остаётся', async () => {
    const { user } = await openReview(UNKNOWN);
    await user.click(screen.getByRole('button', { name: 'Убрать марсианский соус' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Ингредиентов не осталось');
    expect(screen.getByRole('button', { name: 'Добавить' })).toBeDisabled();
  });

  it('«← Другое фото» возвращает к выбору фото', async () => {
    const { user } = await openReview();
    await user.click(screen.getByRole('button', { name: '← Другое фото' }));

    expect(screen.getByLabelText('Фото из галереи')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Распознать' })).toBeInTheDocument();
  });
});

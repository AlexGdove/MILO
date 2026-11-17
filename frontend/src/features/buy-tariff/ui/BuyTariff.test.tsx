import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { useSessionStore } from '@/entities/account';
import { TARIFFS } from '@/shared/config';

import { BuyTariff } from './BuyTariff';

const plus = TARIFFS.find((tariff) => tariff.id === 'plus');
if (!plus) throw new Error('нет тарифа plus');

/** Рендер и открытие окна оформления; возвращает диалог и userEvent. */
const openCheckout = async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <BuyTariff tariff={plus} />
    </MemoryRouter>,
  );
  await user.click(screen.getByRole('button', { name: 'Оплатить' }));
  return { user, dialog: within(screen.getByRole('dialog', { name: 'Тариф Plus' })) };
};

describe('BuyTariff (решение №78)', () => {
  beforeEach(() => {
    useSessionStore.setState({ token: null, account: null });
  });

  it('«Оплатить» открывает окно с ценой и сроком', async () => {
    const { dialog } = await openCheckout();

    expect(dialog.getByText('200 ₽')).toBeInTheDocument();
    expect(dialog.getByText('1 месяц, без автопродления')).toBeInTheDocument();
  });

  it('оплатить можно только после согласия с офертой', async () => {
    const { user, dialog } = await openCheckout();
    const pay = dialog.getByRole('button', { name: 'Оплатить 200 ₽' });

    expect(pay).toBeDisabled();
    await user.click(dialog.getByRole('checkbox', { name: /Принимаю условия/ }));
    expect(pay).toBeEnabled();
  });

  it('до подключения ЮKassa — сообщение, что оплата подключается', async () => {
    const { user, dialog } = await openCheckout();

    await user.click(dialog.getByRole('checkbox', { name: /Принимаю условия/ }));
    await user.click(dialog.getByRole('button', { name: 'Оплатить 200 ₽' }));

    expect(dialog.getByRole('status')).toHaveTextContent(/Приём оплаты подключается/);
  });

  it('без входа — ссылка на вход и регистрацию', async () => {
    const { dialog } = await openCheckout();

    expect(dialog.getByRole('link', { name: 'войдите или зарегистрируйтесь' })).toHaveAttribute(
      'href',
      '/settings/account',
    );
  });

  it('со входом — почта аккаунта, к которому подключится тариф', async () => {
    useSessionStore.setState({
      token: 't',
      account: { id: '1', email: 'a@b.ru', plan: 'free', planUntil: null },
    });
    const { dialog } = await openCheckout();

    expect(dialog.getByText(/a@b\.ru/)).toBeInTheDocument();
    expect(dialog.queryByRole('link', { name: /войдите/ })).not.toBeInTheDocument();
  });

  it('ссылка на публичную оферту', async () => {
    const { dialog } = await openCheckout();

    expect(dialog.getByRole('link', { name: 'публичной оферты' })).toHaveAttribute(
      'href',
      '/offer',
    );
  });

  it('после закрытия окно открывается заново: без согласия и без сообщения', async () => {
    const { user, dialog } = await openCheckout();
    await user.click(dialog.getByRole('checkbox', { name: /Принимаю условия/ }));
    await user.click(dialog.getByRole('button', { name: 'Оплатить 200 ₽' }));

    await user.click(dialog.getByRole('button', { name: 'Закрыть' }));
    await user.click(screen.getByRole('button', { name: 'Оплатить' }));

    const reopened = within(screen.getByRole('dialog', { name: 'Тариф Plus' }));
    expect(reopened.getByRole('checkbox', { name: /Принимаю условия/ })).not.toBeChecked();
    expect(reopened.queryByRole('status')).not.toBeInTheDocument();
  });
});

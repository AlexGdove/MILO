import { render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { ROUTES } from '@/shared/config';

import { OfferPage } from './OfferPage';
import { PrivacyPage } from './PrivacyPage';
import { RequisitesPage } from './RequisitesPage';
import { TariffsPage } from './TariffsPage';

const renderPage = (page: ReactElement, path: string) =>
  render(<MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>);

describe('страницы документов (решение №77)', () => {
  it.each([
    ['Тарифы', <TariffsPage key="t" />, ROUTES.tariffs],
    ['Реквизиты и контакты', <RequisitesPage key="r" />, ROUTES.requisites],
    ['Публичная оферта', <OfferPage key="o" />, ROUTES.offer],
    ['Политика конфиденциальности', <PrivacyPage key="p" />, ROUTES.privacy],
  ] as const)('«%s»: заголовок, ссылка в приложение и все документы внизу', (name, page, path) => {
    renderPage(page, path);

    expect(screen.getByRole('heading', { level: 1, name })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'MILO' })).toHaveAttribute('href', '/');
    const documents = within(screen.getByRole('navigation', { name: 'Документы' }));
    expect(documents.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      ROUTES.tariffs,
      ROUTES.offer,
      ROUTES.privacy,
      ROUTES.requisites,
    ]);
  });

  it('реквизиты: пока не указаны — «уточняется», статус самозанятого виден', () => {
    renderPage(<RequisitesPage />, ROUTES.requisites);

    expect(screen.getAllByText('уточняется').length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText('Плательщик налога на профессиональный доход (самозанятый)'),
    ).toBeInTheDocument();
  });

  it('тарифы: три тарифа с ценами и ссылка на оферту', () => {
    renderPage(<TariffsPage />, ROUTES.tariffs);

    for (const name of ['Бесплатный', 'Plus', 'Pro']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeInTheDocument();
    }
    expect(screen.getByText('Бесплатно')).toBeInTheDocument();
    expect(screen.getByText('200 ₽ в месяц')).toBeInTheDocument();
    expect(screen.getByText('349 ₽ в месяц')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'публичной оферте' })).toHaveAttribute(
      'href',
      ROUTES.offer,
    );
  });

  it('оферта: цены тарифов, раздел о возврате и ссылка на политику', () => {
    renderPage(<OfferPage />, ROUTES.offer);

    expect(screen.getByText(/Plus — 200 ₽ в месяц/)).toBeInTheDocument();
    expect(screen.getByText(/Pro — 349 ₽ в месяц/)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: '6. Отказ и возврат' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Политике конфиденциальности' })).toHaveAttribute(
      'href',
      ROUTES.privacy,
    );
  });

  it('политика: кому передаются данные — Yandex AI Studio для фото', () => {
    renderPage(<PrivacyPage />, ROUTES.privacy);

    expect(
      screen.getByRole('heading', { level: 2, name: '5. Кому передаются' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Yandex AI Studio/)).toBeInTheDocument();
  });
});

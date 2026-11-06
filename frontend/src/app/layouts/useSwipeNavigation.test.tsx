import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';

import { MAIN_SECTIONS, ROUTES } from '@/shared/config';

import { RootLayout } from './RootLayout';

const Where = () => <p data-testid="where">{useLocation().pathname}</p>;
const Page = ({ children }: { children?: React.ReactNode }) => (
  <main>
    <Where />
    {children}
  </main>
);

const renderAt = (path: string, page?: React.ReactNode) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<RootLayout />}>
          {[...MAIN_SECTIONS, '/recipes/:id'].map((route) => (
            <Route key={route} path={route} element={<Page>{page}</Page>} />
          ))}
        </Route>
      </Routes>
    </MemoryRouter>,
  );

const where = () => screen.getByTestId('where').textContent;

/** Жест пальцем: из (x, y) на (dx, dy). jsdom: ширина окна 1024 px. */
const swipe = (target: Element, dx: number, dy = 0, x = 500, y = 300) => {
  fireEvent.touchStart(target, { touches: [{ clientX: x, clientY: y }] });
  fireEvent.touchEnd(target, { changedTouches: [{ clientX: x + dx, clientY: y + dy }] });
};

describe('свайп между разделами', () => {
  it('влево — следующий раздел, вправо — предыдущий', () => {
    renderAt(ROUTES.dashboard);
    swipe(screen.getByTestId('where'), -120);
    expect(where()).toBe(ROUTES.recipes);
    swipe(screen.getByTestId('where'), -120);
    expect(where()).toBe(ROUTES.pantry);
    swipe(screen.getByTestId('where'), 120);
    expect(where()).toBe(ROUTES.recipes);
  });

  it('по краям не зацикливается', () => {
    renderAt(ROUTES.dashboard);
    swipe(screen.getByTestId('where'), 120);
    expect(where()).toBe(ROUTES.dashboard);
  });

  it('с вложенной страницы (рецепт) не листает', () => {
    renderAt('/recipes/abc');
    swipe(screen.getByTestId('where'), -120);
    expect(where()).toBe('/recipes/abc');
  });

  it.each([
    ['короткий', -40, 0],
    ['вертикальный (прокрутка)', -80, 200],
  ])('%s жест не листает', (_name, dx, dy) => {
    renderAt(ROUTES.recipes);
    swipe(screen.getByTestId('where'), dx, dy);
    expect(where()).toBe(ROUTES.recipes);
  });

  it('от самого края экрана (системный «назад») не листает', () => {
    renderAt(ROUTES.recipes);
    swipe(screen.getByTestId('where'), 150, 0, 10);
    expect(where()).toBe(ROUTES.recipes);
  });

  it('в поле ввода и в помеченном data-no-swipe не листает', () => {
    renderAt(
      ROUTES.recipes,
      <>
        <input aria-label="Поиск" />
        <div data-no-swipe>
          <span>Карусель</span>
        </div>
      </>,
    );
    swipe(screen.getByLabelText('Поиск'), -120);
    swipe(screen.getByText('Карусель'), -120);
    expect(where()).toBe(ROUTES.recipes);
  });

  it('при открытом диалоге страница под ним не листается', () => {
    renderAt(ROUTES.recipes, <dialog open>Добавить еду</dialog>);
    swipe(screen.getByText('Добавить еду'), -120);
    expect(where()).toBe(ROUTES.recipes);
  });

  it('направление перехода отмечается для анимации', () => {
    renderAt(ROUTES.dashboard);
    swipe(screen.getByTestId('where'), -120);
    expect(document.documentElement.getAttribute('data-swipe')).toBe('left');
  });

  it('порядок вкладок нижней навигации совпадает с порядком свайпа', () => {
    renderAt(ROUTES.dashboard);
    const links = screen
      .getByRole('navigation', { name: 'Основная навигация' })
      .querySelectorAll('a');
    expect(Array.from(links, (a) => a.getAttribute('href'))).toEqual([...MAIN_SECTIONS]);
  });
});

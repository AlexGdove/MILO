import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Collapsible } from './Collapsible';

type FakeAnimation = { onfinish: (() => void) | null; cancel: () => void };
let animations: FakeAnimation[] = [];
let reducedMotion = false;

// jsdom не умеет Web Animations и matchMedia — подменяем, чтобы проверить ветку с анимацией
beforeEach(() => {
  animations = [];
  reducedMotion = false;
  HTMLElement.prototype.animate = vi.fn(() => {
    const animation: FakeAnimation = { onfinish: null, cancel: vi.fn() };
    animations.push(animation);
    return animation as unknown as Animation;
  });
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: reducedMotion && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  Reflect.deleteProperty(HTMLElement.prototype, 'animate');
});

const renderCollapsible = (defaultOpen = false) => {
  const { container } = render(
    <Collapsible title="Мои данные" defaultOpen={defaultOpen}>
      <p>Форма</p>
    </Collapsible>,
  );
  return { user: userEvent.setup(), details: () => container.querySelector('details') };
};

describe('Collapsible: плавность', () => {
  it('раскрытие анимируется и открывает блок сразу', async () => {
    const { user, details } = renderCollapsible();
    await user.click(screen.getByText('Мои данные'));
    expect(HTMLElement.prototype.animate).toHaveBeenCalledTimes(1);
    expect(details()).toHaveAttribute('open');
  });

  it('сворачивание закрывает блок только после окончания анимации', async () => {
    const { user, details } = renderCollapsible(true);
    await user.click(screen.getByText('Мои данные'));
    expect(HTMLElement.prototype.animate).toHaveBeenCalledTimes(1);
    expect(details()).toHaveAttribute('open');

    // Регрессия (2026-11-05): анимация удерживает 0 до закрытия, иначе в конце мелькала полная высота
    expect(HTMLElement.prototype.animate).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ fill: 'forwards' }),
    );

    act(() => animations[0]?.onfinish?.());
    expect(details()).not.toHaveAttribute('open');
    expect(animations[0]?.cancel).toHaveBeenCalled();
  });

  it('повторное нажатие во время сворачивания снова раскрывает', async () => {
    const { user, details } = renderCollapsible(true);
    await user.click(screen.getByText('Мои данные'));
    await user.click(screen.getByText('Мои данные'));

    expect(animations[0]?.cancel).toHaveBeenCalled();
    expect(HTMLElement.prototype.animate).toHaveBeenCalledTimes(2);
    act(() => animations[1]?.onfinish?.());
    expect(details()).toHaveAttribute('open');
  });

  it('при «уменьшить движение» — без анимации', async () => {
    reducedMotion = true;
    const { user, details } = renderCollapsible();
    await user.click(screen.getByText('Мои данные'));
    expect(HTMLElement.prototype.animate).not.toHaveBeenCalled();
    expect(details()).toHaveAttribute('open');
  });
});

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { Modal } from './Modal';

/** Окно в окне — как выбор продукта внутри формы рецепта. */
const Nested = () => {
  const [outer, setOuter] = useState(true);
  const [inner, setInner] = useState(false);
  return (
    <Modal open={outer} title="Внешнее" onClose={() => setOuter(false)}>
      <button type="button" onClick={() => setInner(true)}>
        Открыть внутреннее
      </button>
      <Modal open={inner} title="Внутреннее" onClose={() => setInner(false)}>
        <button type="button" onClick={() => setInner(false)}>
          Готово
        </button>
      </Modal>
    </Modal>
  );
};

// У закрытого <dialog> нет доступного имени — ищем по aria-label
const isOpen = (name: string) =>
  document.querySelector(`dialog[aria-label="${name}"]`)?.hasAttribute('open') ?? false;

describe('Modal', () => {
  it('закрытие вложенного окна не закрывает внешнее (регрессия 1.0.7)', async () => {
    const user = userEvent.setup();
    render(<Nested />);
    await user.click(screen.getByRole('button', { name: 'Открыть внутреннее' }));
    expect(isOpen('Внутреннее')).toBe(true);

    await user.click(
      within(screen.getByRole('dialog', { name: 'Внутреннее' })).getByRole('button', {
        name: 'Готово',
      }),
    );
    expect(isOpen('Внутреннее')).toBe(false);
    expect(isOpen('Внешнее')).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Открыть внутреннее' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Внутреннее' })).getAllByRole('button', {
        name: 'Закрыть',
      })[0]!,
    );
    expect(isOpen('Внешнее')).toBe(true);
  });
});

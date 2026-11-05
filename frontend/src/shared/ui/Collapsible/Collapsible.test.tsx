import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Collapsible } from './Collapsible';

describe('Collapsible', () => {
  it('свёрнут по умолчанию: виден заголовок и сводка, содержимое скрыто', () => {
    const { container } = render(
      <Collapsible title="Мои данные" summary="Женщина, 25 лет">
        <p>Форма</p>
      </Collapsible>,
    );
    expect(screen.getByRole('heading', { name: 'Мои данные' })).toBeInTheDocument();
    expect(screen.getByText('Женщина, 25 лет')).toBeInTheDocument();
    expect(container.querySelector('details')).not.toHaveAttribute('open');
  });

  it('раскрывается по нажатию на заголовок', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <Collapsible title="Мои данные">
        <p>Форма</p>
      </Collapsible>,
    );
    await user.click(screen.getByText('Мои данные'));
    expect(container.querySelector('details')).toHaveAttribute('open');
  });

  it('defaultOpen — раскрыт сразу', () => {
    const { container } = render(
      <Collapsible title="Мои данные" defaultOpen>
        <p>Форма</p>
      </Collapsible>,
    );
    expect(container.querySelector('details')).toHaveAttribute('open');
  });
});

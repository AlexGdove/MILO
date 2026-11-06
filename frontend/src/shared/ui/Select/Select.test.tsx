import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { Select } from './Select';

describe('Select', () => {
  it('обычный список с опциями и своей стрелкой, скрытой от экранного диктора', async () => {
    const { container } = render(
      <Select aria-label="Язык" defaultValue="ru">
        <option value="ru">Русский</option>
        <option value="en">English</option>
      </Select>,
    );
    const select = screen.getByRole('combobox', { name: 'Язык' });
    expect(select).toHaveValue('ru');
    await userEvent.selectOptions(select, 'en');
    expect(select).toHaveValue('en');
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden');
  });
});

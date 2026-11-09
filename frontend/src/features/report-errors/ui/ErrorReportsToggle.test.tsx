import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { ErrorReportsToggle } from './ErrorReportsToggle';
import { ERROR_REPORTS_STORAGE_KEY, useErrorReportsStore } from '../model/settings';

beforeEach(() => {
  localStorage.clear();
  useErrorReportsStore.setState(useErrorReportsStore.getInitialState(), true);
});

describe('ErrorReportsToggle', () => {
  it('по умолчанию отчёты включены', () => {
    render(<ErrorReportsToggle />);
    expect(screen.getByRole('radio', { name: 'Отправлять' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Не отправлять' })).not.toBeChecked();
  });

  it('человек отключает отчёты, выбор запоминается на устройстве', async () => {
    const user = userEvent.setup();
    render(<ErrorReportsToggle />);

    await user.click(screen.getByRole('radio', { name: 'Не отправлять' }));

    expect(useErrorReportsStore.getState().enabled).toBe(false);
    expect(localStorage.getItem(ERROR_REPORTS_STORAGE_KEY)).toContain('"enabled":false');
  });

  it('и снова включает', async () => {
    const user = userEvent.setup();
    render(<ErrorReportsToggle />);
    await user.click(screen.getByRole('radio', { name: 'Не отправлять' }));
    await user.click(screen.getByRole('radio', { name: 'Отправлять' }));
    expect(useErrorReportsStore.getState().enabled).toBe(true);
  });

  it('объясняет, что уходит, и что личных данных нет', () => {
    render(<ErrorReportsToggle />);
    expect(screen.getByText(/технический отчёт/)).toHaveTextContent(/Ваших продуктов, дневника/);
  });
});

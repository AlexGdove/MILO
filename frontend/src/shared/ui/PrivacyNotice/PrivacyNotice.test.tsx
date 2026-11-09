import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PrivacyNotice } from './PrivacyNotice';

describe('PrivacyNotice (решение №50)', () => {
  it('кратко: данные только на устройстве, о вас ничего не храним', () => {
    render(<PrivacyNotice variant="brief" />);
    expect(screen.getByText(/хранятся только на этом устройстве/)).toBeInTheDocument();
    expect(screen.getByText(/не собираем и не храним информацию о вас/)).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('перед установкой: данные из браузера в приложение не переносятся', () => {
    render(<PrivacyNotice variant="install" />);
    expect(screen.getByText(/данные из браузера в него не переносятся/)).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('подробно: пять пунктов — устройство, без регистрации, что уходит на сервер, отчёты об ошибках, перенос', () => {
    render(<PrivacyNotice variant="full" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText(/только на этом устройстве/)).toBeInTheDocument();
    expect(screen.getByText(/нет регистрации, имени и контактов/)).toBeInTheDocument();
    expect(
      screen.getByText(/обращения в поддержку и предложенные продукты, анонимно/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/технический отчёт об ошибке — без ваших данных.*отключить в настройках/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Скоро рецептом можно будет поделиться/)).toBeInTheDocument();
  });
});

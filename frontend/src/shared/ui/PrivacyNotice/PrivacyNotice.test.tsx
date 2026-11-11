import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PrivacyNotice } from './PrivacyNotice';

describe('PrivacyNotice (решение №50)', () => {
  it('кратко: данные только на устройстве, аккаунт необязателен и хранит только почту и тариф', () => {
    render(<PrivacyNotice variant="brief" />);
    expect(screen.getByText(/хранятся только на этом устройстве/)).toBeInTheDocument();
    expect(screen.getByText(/Аккаунт необязателен и хранит только почту/)).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('перед установкой: данные из браузера в приложение не переносятся', () => {
    render(<PrivacyNotice variant="install" />);
    expect(screen.getByText(/данные из браузера в него не переносятся/)).toBeInTheDocument();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it('подробно: пять пунктов — устройство, необязательный аккаунт, что уходит на сервер, отчёты об ошибках, перенос', () => {
    render(<PrivacyNotice variant="full" />);
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getByText(/только на этом устройстве/)).toBeInTheDocument();
    expect(screen.getByText(/почта, пароль в зашифрованном виде и тариф/)).toBeInTheDocument();
    expect(
      screen.getByText(/обращения в поддержку и предложенные продукты, анонимно/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/технический отчёт об ошибке — без ваших данных.*отключить в настройках/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Скоро рецептом можно будет поделиться/)).toBeInTheDocument();
  });
});

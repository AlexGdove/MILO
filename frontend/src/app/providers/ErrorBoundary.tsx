import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button, EmptyState } from '@/shared/ui';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Ловит ошибки рендера и показывает экран восстановления вместо белого экрана. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('MILO: необработанная ошибка интерфейса', error, info.componentStack);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main role="alert">
          <EmptyState
            title="Что-то пошло не так"
            description="Ваши данные сохранены на устройстве. Перезагрузите страницу, чтобы продолжить."
            action={<Button onClick={this.handleReload}>Перезагрузить</Button>}
          />
        </main>
      );
    }

    return this.props.children;
  }
}

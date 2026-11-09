import { Capacitor } from '@capacitor/core';

import { withDeviceKey } from '@/entities/device-key';
import { apiRequest, isApiEnabled } from '@/shared/api';
import { APP_VERSION } from '@/shared/config';

import {
  buildReport,
  describeError,
  type ErrorKind,
  type ErrorPlatform,
  isNoise,
  type ReportContext,
} from './report';
import { useErrorReportsStore } from './settings';

/** За одно открытие приложения отправляется не больше пяти разных ошибок — без потока запросов. */
export const MAX_REPORTS_PER_SESSION = 5;

const sent = new Set<string>();

const currentPlatform = (): ErrorPlatform => {
  const platform = Capacitor.getPlatform();
  return platform === 'android' || platform === 'ios' ? platform : 'web';
};

const currentContext = (): ReportContext => ({
  platform: currentPlatform(),
  appVersion: APP_VERSION,
  route: window.location.pathname,
  userAgent: navigator.userAgent,
});

/** Забыть, что уже отправлено (для тестов). */
export function resetReporter(): void {
  sent.clear();
}

/**
 * Отправляет отчёт об ошибке, если человек не отключил это в настройках и сервер подключён.
 * Никогда не бросает ошибку и не сообщает о собственных сбоях: отчёты — не повод ломать приложение.
 */
export async function reportError(kind: ErrorKind, reason: unknown): Promise<void> {
  try {
    if (!useErrorReportsStore.getState().enabled || !isApiEnabled()) return;
    const { message, stack } = describeError(reason);
    if (isNoise(message)) return;

    const signature = `${kind}|${message}|${stack?.split('\n')[1] ?? ''}`;
    if (sent.has(signature) || sent.size >= MAX_REPORTS_PER_SESSION) return;
    sent.add(signature);

    const report = buildReport(kind, reason, currentContext());
    await withDeviceKey((deviceKey) =>
      apiRequest<void>('/client-errors', { method: 'POST', body: report, deviceKey }),
    );
  } catch {
    // нет сети, лимит, сервер недоступен — молча: ошибка отчёта не должна порождать новые ошибки
  }
}

/** Подписка на необработанные ошибки страницы; возвращает отмену. */
export function installErrorReporting(): () => void {
  const onError = (event: ErrorEvent) => {
    void reportError('error', event.error ?? event.message);
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    void reportError('unhandledrejection', event.reason);
  };
  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onRejection);
  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onRejection);
  };
}

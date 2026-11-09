import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiRequest, withDeviceKey, isApiEnabled } = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  withDeviceKey: vi.fn(),
  isApiEnabled: vi.fn(),
}));

vi.mock('@/shared/api', () => ({ apiRequest, isApiEnabled }));
vi.mock('@/entities/device-key', () => ({ withDeviceKey }));

import {
  installErrorReporting,
  MAX_REPORTS_PER_SESSION,
  reportError,
  resetReporter,
} from './reporter';
import { useErrorReportsStore } from './settings';

beforeEach(() => {
  resetReporter();
  useErrorReportsStore.setState(useErrorReportsStore.getInitialState(), true);
  apiRequest.mockReset().mockResolvedValue(undefined);
  isApiEnabled.mockReset().mockReturnValue(true);
  withDeviceKey
    .mockReset()
    .mockImplementation((request: (key: string) => Promise<unknown>) => request('mk_test'));
});

describe('reportError', () => {
  it('отправляет технический отчёт с ключом устройства', async () => {
    await reportError('error', new Error('Boom'));

    expect(apiRequest).toHaveBeenCalledOnce();
    const [path, options] = apiRequest.mock.calls[0] as [string, Record<string, any>]; // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(path).toBe('/client-errors');
    expect(options).toMatchObject({
      method: 'POST',
      deviceKey: 'mk_test',
      body: { kind: 'error', message: 'Boom', platform: 'web' },
    });
  });

  it('если отчёты отключены в настройках — ничего не отправляет', async () => {
    useErrorReportsStore.getState().setEnabled(false);
    await reportError('error', new Error('Boom'));
    expect(apiRequest).not.toHaveBeenCalled();
    expect(withDeviceKey).not.toHaveBeenCalled();
  });

  it('если сервер не подключён — ничего не отправляет', async () => {
    isApiEnabled.mockReturnValue(false);
    await reportError('error', new Error('Boom'));
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('шум (ResizeObserver, чужие скрипты) не отправляет', async () => {
    await reportError('error', 'ResizeObserver loop completed with undelivered notifications.');
    await reportError('error', 'Script error.');
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('одну и ту же ошибку за сеанс отправляет один раз', async () => {
    const error = new Error('Boom');
    await reportError('error', error);
    await reportError('error', error);
    expect(apiRequest).toHaveBeenCalledOnce();
  });

  it(`не больше ${MAX_REPORTS_PER_SESSION} разных ошибок за сеанс`, async () => {
    for (let i = 0; i < MAX_REPORTS_PER_SESSION + 3; i += 1) {
      await reportError('error', new Error(`Ошибка ${i}`));
    }
    expect(apiRequest).toHaveBeenCalledTimes(MAX_REPORTS_PER_SESSION);
  });

  it('сбой отправки (нет сети, лимит) не бросает ошибку', async () => {
    apiRequest.mockRejectedValue(new Error('network_error'));
    await expect(reportError('error', new Error('Boom'))).resolves.toBeUndefined();
  });
});

describe('installErrorReporting', () => {
  it('ловит необработанную ошибку страницы и промис, отмена снимает подписку', async () => {
    const uninstall = installErrorReporting();

    window.dispatchEvent(new ErrorEvent('error', { error: new Error('Из окна') }));
    const rejection = new Event('unhandledrejection');
    Object.assign(rejection, { reason: new Error('Из промиса') });
    window.dispatchEvent(rejection);
    await vi.waitFor(() => expect(apiRequest).toHaveBeenCalledTimes(2));

    const kinds = apiRequest.mock.calls.map(
      ([, options]) => (options as { body: { kind: string } }).body.kind,
    );
    expect(kinds).toEqual(['error', 'unhandledrejection']);

    uninstall();
    window.dispatchEvent(new ErrorEvent('error', { error: new Error('После отмены') }));
    await Promise.resolve();
    expect(apiRequest).toHaveBeenCalledTimes(2);
  });
});

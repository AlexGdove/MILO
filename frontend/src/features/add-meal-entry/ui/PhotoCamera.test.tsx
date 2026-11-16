import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PhotoCamera } from './PhotoCamera';

const setMediaDevices = (value: unknown) =>
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value });
const setSecure = (value: boolean) =>
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value });

/** Поток камеры: дорожки запоминают остановку */
const fakeStream = () => {
  const track = { stop: vi.fn() };
  const stream = { getTracks: () => [track] } as unknown as MediaStream;
  return { track, stream };
};

const renderCamera = () => {
  const onCapture = vi.fn<(photo: Blob) => void>();
  const onCancel = vi.fn();
  const view = render(<PhotoCamera onCapture={onCapture} onCancel={onCancel} />);
  return { onCapture, onCancel, ...view };
};

/** Дождаться текста статуса камеры (он меняется после запуска) */
const expectStatus = (text: string | RegExp) =>
  vi.waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(text));

const shutter = () => screen.getByRole('button', { name: 'Снять' });

beforeEach(() => {
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  setSecure(true);
});

afterEach(() => {
  setMediaDevices(undefined);
  setSecure(true);
  vi.restoreAllMocks();
});

describe('PhotoCamera', () => {
  it('пока камера запускается, кнопка съёмки выключена', () => {
    setMediaDevices({ getUserMedia: () => new Promise<MediaStream>(() => undefined) });
    renderCamera();

    expect(screen.getByRole('status')).toHaveTextContent('Запускаем камеру…');
    expect(shutter()).toBeDisabled();
  });

  it('без HTTPS камеру не просит и предлагает галерею', async () => {
    const getUserMedia = vi.fn();
    setMediaDevices({ getUserMedia });
    setSecure(false);
    renderCamera();

    await expectStatus('только по защищённому соединению (HTTPS)');
    expect(getUserMedia).not.toHaveBeenCalled();
    expect(shutter()).toBeDisabled();
  });

  it('без доступа к устройствам — «Камера недоступна»', async () => {
    setMediaDevices(undefined);
    renderCamera();
    await expectStatus('Камера недоступна. Выберите фото из галереи.');
  });

  it('запрет доступа — объясняет, где разрешить', async () => {
    setMediaDevices({
      getUserMedia: vi.fn().mockRejectedValue(new DOMException('x', 'NotAllowedError')),
    });
    renderCamera();
    await expectStatus(/Нет доступа к камере/);
    expect(shutter()).toBeDisabled();
  });

  it('другая ошибка камеры — «Камера недоступна»', async () => {
    setMediaDevices({ getUserMedia: vi.fn().mockRejectedValue(new Error('boom')) });
    renderCamera();
    await expectStatus(/Камера недоступна/);
  });

  it('запускает заднюю камеру без звука и включает кнопку съёмки', async () => {
    const { stream } = fakeStream();
    const getUserMedia = vi.fn().mockResolvedValue(stream);
    setMediaDevices({ getUserMedia });
    renderCamera();

    await expectStatus('Наведите камеру на блюдо');
    expect(shutter()).toBeEnabled();
    expect(getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({
        audio: false,
        video: expect.objectContaining({ facingMode: { ideal: 'environment' } }) as unknown,
      }),
    );
  });

  it('«Назад» закрывает камеру', async () => {
    const user = userEvent.setup();
    setMediaDevices(undefined);
    const { onCancel } = renderCamera();

    await user.click(screen.getByRole('button', { name: 'Назад' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('при уходе с экрана камера выключается', async () => {
    const { track, stream } = fakeStream();
    setMediaDevices({ getUserMedia: vi.fn().mockResolvedValue(stream) });
    const { unmount } = renderCamera();
    await expectStatus('Наведите камеру на блюдо');

    expect(track.stop).not.toHaveBeenCalled();
    unmount();
    expect(track.stop).toHaveBeenCalled();
  });

  it('если ушли до запуска, пришедший позже поток тоже выключается', async () => {
    const { track, stream } = fakeStream();
    let resolve!: (value: MediaStream) => void;
    const pending = new Promise<MediaStream>((r) => {
      resolve = r;
    });
    setMediaDevices({ getUserMedia: vi.fn().mockReturnValue(pending) });
    const { unmount } = renderCamera();

    unmount();
    resolve(stream);
    await vi.waitFor(() => expect(track.stop).toHaveBeenCalled());
  });
});

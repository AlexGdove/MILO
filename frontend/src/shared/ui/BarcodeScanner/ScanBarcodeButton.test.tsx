vi.mock('@/shared/lib', () => ({ createBarcodeReader: vi.fn() }));

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';

import { createBarcodeReader } from '@/shared/lib';

import { ScanBarcodeButton } from './ScanBarcodeButton';

describe('ScanBarcodeButton', () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined);
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });
    vi.restoreAllMocks();
  });

  it('по умолчанию кнопка есть, при клике открывается диалог', async () => {
    render(<ScanBarcodeButton onScan={() => undefined} />);
    expect(screen.getByLabelText('Сканировать штрихкод')).toBeInTheDocument();
    await userEvent.click(screen.getByLabelText('Сканировать штрихкод'));
    expect(screen.getByRole('dialog', { name: 'Сканер штрихкода' })).toBeVisible();
  });

  it('успешно сканирует и вызывает onScan', async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => Promise.resolve(stream) },
    });

    const readerMock = { read: vi.fn().mockResolvedValue('4600000000012') };
    vi.mocked(createBarcodeReader).mockResolvedValue(
      readerMock as unknown as Awaited<ReturnType<typeof createBarcodeReader>>,
    );

    const onScan = vi.fn<(code: string) => void>();
    render(<ScanBarcodeButton onScan={onScan} />);

    await userEvent.click(screen.getByLabelText('Сканировать штрихкод'));

    await waitFor(() => expect(onScan).toHaveBeenCalledWith('4600000000012'));
    expect(track.stop).toHaveBeenCalled();
  });

  it('отказ в доступе к камере отображает сообщение об ошибке', async () => {
    const error = new DOMException('x', 'NotAllowedError');
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => Promise.reject(error) },
    });

    const onScan = vi.fn<(code: string) => void>();
    render(<ScanBarcodeButton onScan={onScan} />);

    await userEvent.click(screen.getByLabelText('Сканировать штрихкод'));

    const statusText = await screen.findByRole('status');
    expect(statusText).toHaveTextContent(/Нет доступа к камере/);
    expect(onScan).not.toHaveBeenCalled();
  });

  it('отсутствие mediaDevices отображает сообщение о недоступности', async () => {
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: undefined });

    const onScan = vi.fn<(code: string) => void>();
    render(<ScanBarcodeButton onScan={onScan} />);

    await userEvent.click(screen.getByLabelText('Сканировать штрихкод'));

    const statusText = await screen.findByRole('status');
    expect(statusText).toHaveTextContent(/Камера или сканер недоступны/);
    expect(onScan).not.toHaveBeenCalled();
  });

  it('закрытие кнопки до появления кода останавливает треки и не вызывает onScan', async () => {
    const track = { stop: vi.fn() };
    const stream = { getTracks: () => [track] } as unknown as MediaStream;
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: () => Promise.resolve(stream) },
    });

    const readerMock = { read: vi.fn().mockResolvedValue(null) };
    vi.mocked(createBarcodeReader).mockResolvedValue(
      readerMock as unknown as Awaited<ReturnType<typeof createBarcodeReader>>,
    );

    const onScan = vi.fn<(code: string) => void>();
    render(<ScanBarcodeButton onScan={onScan} />);

    await userEvent.click(screen.getByLabelText('Сканировать штрихкод'));

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Сканер штрихкода' })).toBeVisible(),
    );

    await userEvent.click(screen.getByLabelText('Закрыть'));

    expect(track.stop).toHaveBeenCalled();
    expect(onScan).not.toHaveBeenCalled();
  });
});

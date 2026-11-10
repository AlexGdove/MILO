import { afterEach, describe, expect, it, vi } from 'vitest';

import { createBarcodeReader, pickBarcode, SCAN_FORMATS } from './barcodeScanner';

describe('pickBarcode', () => {
  it('возвращает валидный EAN-13 код из списка', () => {
    expect(pickBarcode(['4600000000012'])).toBe('4600000000012');
  });

  it('обрезает пробелы вокруг кода', () => {
    expect(pickBarcode(['  4600000000012 '])).toBe('4600000000012');
  });

  it('пропускает URL и другие нецифровые строки', () => {
    expect(pickBarcode(['https://x.ru'])).toBeNull();
  });

  it('пропускает строки с менее чем 8 цифрами', () => {
    expect(pickBarcode(['1234567'])).toBeNull();
  });

  it('пропускает строки с более чем 14 цифрами', () => {
    expect(pickBarcode(['123456789012345'])).toBeNull();
  });

  it('пропускает строки, содержащие буквы', () => {
    expect(pickBarcode(['abc12345678'])).toBeNull();
  });

  it('берёт первый подходящий код из списка', () => {
    expect(pickBarcode(['https://x.ru', '4600000000012', '12345678'])).toBe('4600000000012');
  });

  it('возвращает null для пустого массива', () => {
    expect(pickBarcode([])).toBeNull();
  });

  it('принимает код длиной ровно 8 цифр (EAN-8)', () => {
    expect(pickBarcode(['12345678'])).toBe('12345678');
  });

  it('принимает код длиной ровно 14 цифр', () => {
    expect(pickBarcode(['12345678901234'])).toBe('12345678901234');
  });
});

describe('SCAN_FORMATS', () => {
  it('содержит ровно четыре формата штрихкодов', () => {
    expect(SCAN_FORMATS).toEqual(['ean_13', 'ean_8', 'upc_a', 'upc_e']);
  });
});

describe('createBarcodeReader', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('создаёт reader, который возвращает распознанный код при поддержке всех форматов', async () => {
    const supportedFormats = ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
    const capturedFormats: string[] = [];

    class FakeDetectorClass {
      static async getSupportedFormats() {
        return supportedFormats;
      }

      constructor(options: { formats: string[] }) {
        capturedFormats.push(...options.formats);
      }

      async detect(_source: HTMLVideoElement) {
        return [{ rawValue: '4600000000012' }];
      }
    }

    vi.stubGlobal('BarcodeDetector', FakeDetectorClass);

    const reader = await createBarcodeReader();
    const result = await reader.read({} as HTMLVideoElement);

    expect(result).toBe('4600000000012');
    expect(capturedFormats).toEqual(SCAN_FORMATS);
  });

  it('возвращает null, если детектор нашёл только невалидные коды', async () => {
    class FakeDetectorClass {
      static async getSupportedFormats() {
        return ['ean_13', 'ean_8', 'upc_a', 'upc_e'];
      }

      constructor(_options: { formats: string[] }) {}

      async detect(_source: HTMLVideoElement) {
        return [{ rawValue: 'hello' }];
      }
    }

    vi.stubGlobal('BarcodeDetector', FakeDetectorClass);

    const reader = await createBarcodeReader();
    const result = await reader.read({} as HTMLVideoElement);

    expect(result).toBeNull();
  });
});

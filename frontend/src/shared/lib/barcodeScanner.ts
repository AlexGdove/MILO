/** Форматы товарных штрихкодов (EAN-13, EAN-8, UPC-A, UPC-E) — этого достаточно для продуктов. */
export const SCAN_FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e'] as const;

/** Товарный штрихкод — 8–14 цифр (как `normalizeBarcode` в сущности продукта). */
const PRODUCT_CODE = /^\d{8,14}$/;

/** Первое значение, похожее на товарный штрихкод; QR и прочее без цифр игнорируется. */
export const pickBarcode = (values: readonly string[]): string | null =>
  values.map((value) => value.trim()).find((value) => PRODUCT_CODE.test(value)) ?? null;

export interface BarcodeReader {
  /** Читает кадр из видео; `null` — штрихкода в кадре нет. */
  read: (video: HTMLVideoElement) => Promise<string | null>;
}

interface DetectorLike {
  detect: (source: HTMLVideoElement) => Promise<readonly { rawValue: string }[]>;
}

type DetectorConstructor = new (options: { formats: string[] }) => DetectorLike;

const toReader = (detector: DetectorLike): BarcodeReader => ({
  read: async (video) => pickBarcode((await detector.detect(video)).map((item) => item.rawValue)),
});

/**
 * Читатель штрихкодов. Встроенный `BarcodeDetector` (Chrome на Android) — если он умеет нужные
 * форматы; иначе полифил на ZXing/WASM, который грузится только при открытии сканера (№57).
 * Файл .wasm отдаётся с нашего домена: CDN полифила закрыт CSP и не работает офлайн.
 */
export const createBarcodeReader = async (): Promise<BarcodeReader> => {
  const native = (
    globalThis as {
      BarcodeDetector?: DetectorConstructor & { getSupportedFormats?: () => Promise<string[]> };
    }
  ).BarcodeDetector;
  if (native?.getSupportedFormats) {
    const supported = await native.getSupportedFormats();
    if (SCAN_FORMATS.every((format) => supported.includes(format))) {
      return toReader(new native({ formats: [...SCAN_FORMATS] }));
    }
  }

  const [{ BarcodeDetector, prepareZXingModule }, { default: wasmUrl }] = await Promise.all([
    import('barcode-detector/ponyfill'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ]);
  prepareZXingModule({
    overrides: {
      locateFile: (path: string, prefix: string) =>
        path.endsWith('.wasm') ? wasmUrl : prefix + path,
    },
  });
  return toReader(new BarcodeDetector({ formats: [...SCAN_FORMATS] }));
};

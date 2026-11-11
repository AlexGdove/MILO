/** Штрихкод: 8–14 цифр (EAN-8, UPC, EAN-13, GTIN-14). */
const BARCODE = /^\d{8,14}$/;

/** Штрихкод без пробелов, если он подходит; иначе `null`. */
export const normalizeBarcode = (raw: string | null | undefined): string | null => {
  const code = (raw ?? '').replace(/\s+/g, '');
  return BARCODE.test(code) ? code : null;
};

/** GTIN-14: штрихкод, дополненный нулями слева до 14 цифр — EAN-13 «0…» и UPC-A совпадают. */
export const toGtin14 = (code: string): string => code.padStart(14, '0');

/** Один и тот же товар: оба — штрихкоды и совпадают после дополнения нулями. */
export const sameBarcode = (a: string, b: string): boolean => {
  const normalizedA = normalizeBarcode(a);
  const normalizedB = normalizeBarcode(b);
  if (!normalizedA || !normalizedB) return false;
  return toGtin14(normalizedA) === toGtin14(normalizedB);
};

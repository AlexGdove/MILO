/** Штрихкод: 8–14 цифр (EAN-8, UPC, EAN-13, GTIN-14). */
const BARCODE = /^\d{8,14}$/;

/** Штрихкод без пробелов, если он подходит; иначе `null`. */
export const normalizeBarcode = (raw: string | null | undefined): string | null => {
  const code = (raw ?? '').replace(/\s+/g, '');
  return BARCODE.test(code) ? code : null;
};

/**
 * Штрихкод товара: EAN-8, UPC-A (12), EAN-13 или GTIN-14 — только цифры, последняя —
 * контрольная (GS1, mod 10). Опечатку в одной цифре контрольная цифра ловит всегда.
 */
export const BARCODE_PATTERN = /^(\d{8}|\d{12,14})$/;

export function isValidBarcode(value: string): boolean {
  if (!BARCODE_PATTERN.test(value)) return false;
  const digits = [...value].map(Number);
  const check = digits.pop();
  // Справа налево (без контрольной): веса 3, 1, 3, 1, …
  const sum = digits
    .reverse()
    .reduce((acc, digit, index) => acc + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

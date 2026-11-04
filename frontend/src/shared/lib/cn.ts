/** Склеивает CSS-классы, пропуская falsy-значения. */
export const cn = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

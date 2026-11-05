/**
 * Порции приготовленного блюда могут быть дробными: часть съели в граммах.
 * Храним с точностью до 0.001 порции — этого хватает и для граммов, и для суммирования.
 */
export const roundPortions = (value: number): number => Math.round(value * 1000) / 1000;

/** Для показа: до десятых («2,5»); очень маленький остаток — «< 0,1», а не «0». */
export const formatPortions = (value: number): string => {
  if (value > 0 && value < 0.05) return '< 0,1';
  return value.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
};

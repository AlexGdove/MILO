import type { AutomodFlag, KnownProduct } from './automod.js';
import type { ProductDto, SubmissionDto } from './dto/product.dto.js';
import type { Product, ProductSubmission } from '../../generated/prisma/client.js';

type Decimalish = { toNumber(): number };
const num = (value: Decimalish) => value.toNumber();

function per100g(row: Pick<Product, 'kcal' | 'protein' | 'fat' | 'carbs'>) {
  return {
    kcal: num(row.kcal),
    protein: num(row.protein),
    fat: num(row.fat),
    carbs: num(row.carbs),
  };
}

export function toProduct(row: Product): ProductDto {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    barcode: row.barcode,
    unit: row.unit,
    pieceWeight: row.pieceWeight === null ? null : num(row.pieceWeight),
    per100g: per100g(row),
    createdAt: row.createdAt.toISOString(),
  };
}

/** Продукт для сравнения в автомодерации. */
export function toKnown(row: Product | null): KnownProduct | null {
  return row ? { id: row.id, ...per100g(row) } : null;
}

export function toSubmission(row: ProductSubmission): SubmissionDto {
  return {
    id: row.id,
    status: row.status,
    flags: row.flags as AutomodFlag[],
    reviewedBy: row.reviewedBy,
    productId: row.productId,
    name: row.name,
    brand: row.brand,
    barcode: row.barcode,
    createdAt: row.createdAt.toISOString(),
  };
}

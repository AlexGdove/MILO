/** Решение по предложению (B-18): `pending` — ждёт оператора в боте модерации. */
export type SubmissionStatus = 'pending' | 'approved' | 'rejected';

/** Предложение продукта в общую базу (`docs/backend/api.md`, ProductSubmission). */
export interface ProductSubmission {
  id: string;
  status: SubmissionStatus;
  /** Коды замечаний автомодерации, например `energy_mismatch` */
  flags: string[];
  reviewedBy: 'auto' | 'operator' | null;
  /** Продукт общей базы, если принято */
  productId: string | null;
  name: string;
  brand: string | null;
  barcode: string | null;
  createdAt: string;
}

/** Тело `POST /product-submissions`: только описание продукта, без остатков. */
export interface SubmissionRequest {
  name: string;
  brand?: string;
  barcode?: string;
  unit: 'g' | 'ml' | 'pcs';
  pieceWeight: number | null;
  per100g: { kcal: number; protein: number; fat: number; carbs: number };
}

/** Что известно на устройстве о предложении своего продукта. */
export interface SubmissionRecord {
  id: string;
  status: SubmissionStatus;
  flags: string[];
  submittedAt: number;
}

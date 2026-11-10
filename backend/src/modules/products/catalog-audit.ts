// Аудит общей базы продуктов (п. 7e): дубли и записи, которые сегодняшняя автомодерация не
// пропустила бы. Только чистые функции — чтение базы и печать отчёта в `cli/catalog-audit.ts`.
// Ничего не удаляет: слияние и удаление оператор решает сам, увидев отчёт.
import { type AutomodFlag, moderateSubmission, type Nutrients } from './automod.js';

export interface AuditProduct extends Nutrients {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  unit: string;
}

/**
 * Ключ сравнения: регистр, «ё», знаки препинания и пробелы не важны, запятая и точка в числах —
 * одно и то же («Кефир 3,2 %» и «кефир 3.2%» совпадают). Единица входит в ключ: кефир в мл и
 * в граммах — разные продукты.
 */
export function productKey(product: Pick<AuditProduct, 'name' | 'brand' | 'unit'>): string {
  const clean = (text: string) =>
    text
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[^\p{L}\p{N}%]/gu, '');
  return [clean(product.name), clean(product.brand ?? ''), product.unit].join('|');
}

/** Группы продуктов с одним ключом (по две и более), самые большие первыми. */
export function findDuplicateGroups<T extends AuditProduct>(products: readonly T[]): T[][] {
  const groups = new Map<string, T[]>();
  for (const product of products) {
    const key = productKey(product);
    const group = groups.get(key);
    if (group) group.push(product);
    else groups.set(key, [product]);
  }
  return [...groups.values()]
    .filter((group) => group.length > 1)
    .sort((a, b) => b.length - a.length || a[0]!.name.localeCompare(b[0]!.name, 'ru'));
}

export interface SuspiciousProduct<T extends AuditProduct> {
  product: T;
  /** `reject` — автомодерация отклонила бы сегодня; `review` — отправила бы человеку */
  verdict: 'reject' | 'review';
  flags: AutomodFlag[];
}

/** Записи, которые автомодерация сейчас не приняла бы (мат, ссылки, бессмыслица, КБЖУ не сходятся). */
export function findSuspicious<T extends AuditProduct>(
  products: readonly T[],
): SuspiciousProduct<T>[] {
  const result: SuspiciousProduct<T>[] = [];
  for (const product of products) {
    // Без контекста: дубли ищем отдельно, автора у записи в общей базе нет
    const verdict = moderateSubmission(product, {
      sameBarcode: null,
      sameName: null,
      recentRejections: 0,
    });
    if (verdict.verdict !== 'approve') {
      result.push({ product, verdict: verdict.verdict, flags: verdict.flags });
    }
  }
  return result.sort(
    (a, b) =>
      Number(b.verdict === 'reject') - Number(a.verdict === 'reject') ||
      a.product.name.localeCompare(b.product.name, 'ru'),
  );
}

const describe = (product: AuditProduct) =>
  `${product.id.slice(0, 8)}  ${product.name}${product.brand ? ` (${product.brand})` : ''}` +
  ` · ${product.unit} · ${product.kcal} ккал${product.barcode ? ` · ${product.barcode}` : ''}`;

/** Текст отчёта для консоли. */
export function formatAudit(products: readonly AuditProduct[]): string {
  const duplicates = findDuplicateGroups(products);
  const suspicious = findSuspicious(products);
  const lines = [`Продуктов в общей базе: ${products.length}`, ''];

  lines.push(`Возможные дубли (одинаковые название, бренд и единица): ${duplicates.length} групп`);
  for (const group of duplicates) {
    lines.push('', ...group.map((product) => `  ${describe(product)}`));
  }

  lines.push('', `Не прошли бы автомодерацию сегодня: ${suspicious.length}`);
  for (const item of suspicious) {
    const label = item.verdict === 'reject' ? 'отклонить' : 'проверить';
    lines.push(`  [${label}] ${describe(item.product)}  — ${item.flags.join(', ')}`);
  }
  if (duplicates.length === 0 && suspicious.length === 0) lines.push('', 'Замечаний нет.');
  return lines.join('\n');
}

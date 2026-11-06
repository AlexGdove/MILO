/**
 * Курсор страницы (`api.md`: непрозрачная строка): позиция последнего элемента в порядке
 * «новые сверху» — время создания и id (для одинакового времени). base64url от JSON.
 */
export interface PageCursor {
  createdAt: Date;
  id: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(cursor: PageCursor): string {
  return Buffer.from(
    JSON.stringify({ p: cursor.createdAt.toISOString(), i: cursor.id }),
    'utf8',
  ).toString('base64url');
}

/** Разбор курсора клиента; подделанный или повреждённый — `null`. */
export function decodeCursor(value: string): PageCursor | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { p, i } = parsed as { p?: unknown; i?: unknown };
    if (typeof p !== 'string' || typeof i !== 'string' || !UUID.test(i)) return null;
    const createdAt = new Date(p);
    if (Number.isNaN(createdAt.getTime()) || createdAt.toISOString() !== p) return null;
    return { createdAt, id: i };
  } catch {
    return null;
  }
}

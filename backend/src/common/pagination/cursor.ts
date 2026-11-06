/**
 * Курсор страницы (`api.md`: непрозрачная строка): позиция последнего элемента в порядке
 * «новые сверху» — время (создания или последнего изменения) и id (для одинакового времени). base64url от JSON.
 */
export interface PageCursor {
  at: Date;
  id: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function encodeCursor(cursor: PageCursor): string {
  return Buffer.from(JSON.stringify({ p: cursor.at.toISOString(), i: cursor.id }), 'utf8').toString(
    'base64url',
  );
}

/** Разбор курсора клиента; подделанный или повреждённый — `null`. */
export function decodeCursor(value: string): PageCursor | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { p, i } = parsed as { p?: unknown; i?: unknown };
    if (typeof p !== 'string' || typeof i !== 'string' || !UUID.test(i)) return null;
    const at = new Date(p);
    if (Number.isNaN(at.getTime()) || at.toISOString() !== p) return null;
    return { at, id: i };
  } catch {
    return null;
  }
}

import { decodeCursor, encodeCursor } from './cursor.js';

const ID = '3f1c2a9e-8b7d-4c6e-9a1b-2c3d4e5f6a7b';
const AT = new Date('2026-11-05T12:00:00.000Z');
const raw = (obj: unknown) => Buffer.from(JSON.stringify(obj), 'utf8').toString('base64url');

describe('Кодирование и декодирование курсора', () => {
  it('encodeCursor и decodeCursor должны быть обратными функциями', () => {
    const decoded = decodeCursor(encodeCursor({ createdAt: AT, id: ID }));
    expect(decoded).toEqual({ createdAt: AT, id: ID });
    expect(decoded?.createdAt.toISOString()).toBe('2026-11-05T12:00:00.000Z');
    expect(decoded?.id).toBe(ID);
  });

  it('encodeCursor возвращает строку только из символов base64url', () => {
    expect(encodeCursor({ createdAt: AT, id: ID })).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it.each([
    ['не base64-JSON', 'не-курсор'],
    ['пустая строка', ''],
    ['JSON-число', raw(5)],
    ['null', raw(null)],
    ['id не UUID', raw({ p: '2026-11-05T12:00:00.000Z', i: 'abc' })],
    ['нет id', raw({ p: '2026-11-05T12:00:00.000Z' })],
    ['дата не ISO', raw({ p: '5 ноября', i: ID })],
    ['дата без миллисекунд', raw({ p: '2026-11-05T12:00:00Z', i: ID })],
    ['p — число', raw({ p: 123, i: ID })],
  ])('decodeCursor возвращает null: %s', (_name, input) => {
    expect(decodeCursor(input)).toBeNull();
  });
});

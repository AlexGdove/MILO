import { fromPrismaError } from './prisma-errors.js';
import { Prisma } from '../generated/prisma/client.js';

const known = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('db error', { code, clientVersion: '7.10.1' });

describe('fromPrismaError', () => {
  it.each([
    ['P2002', 409, 'conflict'],
    ['P2003', 409, 'conflict'],
    ['P2034', 409, 'conflict'],
    ['P2025', 404, 'not_found'],
    ['P1001', 503, 'service_unavailable'],
  ])('%s → %i %s', (code, status, apiCode) => {
    const exception = fromPrismaError(known(code));
    expect(exception?.getStatus()).toBe(status);
    expect(exception?.code).toBe(apiCode);
  });

  it('неизвестный код Prisma не переводится (останется 500)', () => {
    expect(fromPrismaError(known('P2010'))).toBeNull();
  });

  it('ошибка подключения → 503', () => {
    const error = new Prisma.PrismaClientInitializationError('cannot connect', '7.10.1');
    expect(fromPrismaError(error)?.getStatus()).toBe(503);
  });

  it('не ошибка Prisma → null', () => {
    expect(fromPrismaError(new Error('other'))).toBeNull();
  });

  it('сообщение не раскрывает подробности базы', () => {
    expect(fromPrismaError(known('P2002'))?.message).not.toContain('db error');
  });
});

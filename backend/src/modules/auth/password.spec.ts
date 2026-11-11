import { hashPassword, verifyPassword } from './password.js';

describe('Пароли', () => {
  it('хэш совпадает с форматом', async () => {
    const hash = await hashPassword('test1234');
    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$[A-Za-z0-9_-]+\$[A-Za-z0-9_-]+$/);
  });

  it('верный пароль возвращает true, неверный — false', async () => {
    const hash = await hashPassword('correct_pass');
    expect(await verifyPassword('correct_pass', hash)).toBe(true);
    expect(await verifyPassword('wrong_pass', hash)).toBe(false);
    expect(await verifyPassword('Correct_pass', hash)).toBe(false);
  });

  it('два хэша одного пароля различаются и оба проверяются', async () => {
    const first = await hashPassword('salt_test');
    const second = await hashPassword('salt_test');
    expect(first).not.toBe(second);
    expect(await verifyPassword('salt_test', first)).toBe(true);
    expect(await verifyPassword('salt_test', second)).toBe(true);
  }, 20_000);

  it('пароль с кириллицей и эмодзи верифицируется', async () => {
    const hash = await hashPassword('Пароль🙂123');
    expect(await verifyPassword('Пароль🙂123', hash)).toBe(true);
  });

  it('испорченные строки и параметры вне пределов не бросают и дают false', async () => {
    const parts = (await hashPassword('x')).split('$');
    const withPart = (index: number, value: string) =>
      parts.map((part, i) => (i === index ? value : part)).join('$');

    const cases = [
      '',
      'abc',
      'bcrypt$1$2$3$4$5',
      `${parts.join('$')}$extra`,
      withPart(1, '0'),
      withPart(1, 'abc'),
      withPart(1, '99999999'),
      withPart(1, '1000'),
      withPart(2, '100000'),
      withPart(3, '-1'),
      withPart(4, ''),
      withPart(5, ''),
    ];
    for (const stored of cases) {
      await expect(verifyPassword('x', stored)).resolves.toBe(false);
    }
  }, 20_000);

  it('изменённый хэш возвращает false', async () => {
    const parts = (await hashPassword('modify_test')).split('$');
    const hash = parts[5]!;
    // Первый символ base64url целиком значимый (у последнего часть битов — заполнение)
    parts[5] = (hash[0] === 'A' ? 'B' : 'A') + hash.slice(1);
    expect(await verifyPassword('modify_test', parts.join('$'))).toBe(false);
  }, 20_000);
});

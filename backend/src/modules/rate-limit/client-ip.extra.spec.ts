import { clientIp } from './client-ip.js';

describe('IP клиента: дополнительные случаи', () => {
  it('IPv6-адреса в цепочке возвращаются корректно при любом N', () => {
    const ipv6First = '2001:db8::1';
    const ipv6Second = 'fe80::1';

    expect(clientIp(ipv6First, `${ipv6First}, ${ipv6Second}`, 0)).toBe(ipv6First);
    expect(clientIp('192.168.1.1', `${ipv6Second}, ${ipv6First}`, 1)).toBe(ipv6First);
    expect(clientIp('::1', ipv6Second, 0)).toBe('::1');
  });

  it('IPv4-mapped адрес сокета при N=0 игнорирует заголовок и возвращает сокет', () => {
    const mappedSocket = '::ffff:172.18.0.5';
    expect(clientIp(mappedSocket, '0.0.0.0', 0)).toBe(mappedSocket);
  });

  it('Пустая строка заголовка при N=1 возвращает адрес сокета', () => {
    const socket = '10.0.0.1';
    expect(clientIp(socket, '', 1)).toBe(socket);
  });

  it('N больше длины цепочки при передаче массива заголовков возвращает последнее звено', () => {
    // forwardedFor в виде массива ['a'] -> цепочка ['r', 'a'], длина 2
    expect(clientIp('r', ['a'], 5)).toBe('a');
  });

  it.each`
    trustProxy | expected
    ${0}       | ${'r'}
    ${1}       | ${'c'}
    ${2}       | ${'b'}
    ${3}       | ${'a'}
  `(
    'Цепочка "a, b, c" и сокет "r": при trustProxy=$trustProxy возвращается $expected',
    ({ trustProxy, expected }) => {
      expect(clientIp('r', 'a, b, c', trustProxy)).toBe(expected);
    },
  );
});

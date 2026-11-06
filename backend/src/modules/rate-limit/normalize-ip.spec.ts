import { normalizeIp } from './normalize-ip.js';

describe('Нормализация IP-адресов', () => {
  it.each([
    ['203.0.113.7', '203.0.113.7'],
    ['::ffff:203.0.113.7', '203.0.113.7'],
    ['::FFFF:203.0.113.7', '203.0.113.7'],
    ['2001:db8:1:2:3:4:5:6', '2001:0db8:0001:0002::/64'],
    ['2001:db8:1:2::1', '2001:0db8:0001:0002::/64'],
    ['2001:db8::1', '2001:0db8:0000:0000::/64'],
    ['::1', '0000:0000:0000:0000::/64'],
    ['fe80::1%eth0', 'fe80:0000:0000:0000::/64'],
    ['unknown', 'unknown'],
  ])('%s → %s', (input, expected) => {
    expect(normalizeIp(input)).toBe(expected);
  });

  it('2001:db8:1:2::a и 2001:db8:1:2:ffff::b дают одинаковый результат', () => {
    expect(normalizeIp('2001:db8:1:2::a')).toBe(normalizeIp('2001:db8:1:2:ffff::b'));
  });

  it('2001:db8:1:3::a даёт другой результат', () => {
    expect(normalizeIp('2001:db8:1:3::a')).not.toBe(normalizeIp('2001:db8:1:2::a'));
  });
});

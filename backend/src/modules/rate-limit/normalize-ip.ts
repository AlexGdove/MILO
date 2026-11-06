import { isIPv4, isIPv6 } from 'node:net';

const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

/** IPv6 → 8 групп по 4 hex-цифры (раскрывает `::`, IPv4 в конце адреса — две группы). */
function expandIPv6(ip: string): string[] {
  let address = ip.toLowerCase();
  const tail = address.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (tail?.[1]) {
    const bytes = tail[1].split('.').map(Number);
    const hex = (hi = 0, lo = 0) => ((hi << 8) | lo).toString(16);
    address = `${address.slice(0, -tail[1].length)}${hex(bytes[0], bytes[1])}:${hex(bytes[2], bytes[3])}`;
  }
  const [head = '', rest] = address.split('::');
  const left = head ? head.split(':') : [];
  const right = rest ? rest.split(':') : [];
  const middle = rest === undefined ? [] : Array<string>(8 - left.length - right.length).fill('0');
  return [...left, ...middle, ...right].map((group) => group.padStart(4, '0'));
}

/**
 * Адрес для ключа лимита. IPv4 и IPv4-mapped IPv6 (`::ffff:1.2.3.4`) — как IPv4. IPv6 —
 * подсеть /64: один абонент обычно получает целую /64 и иначе обходил бы лимит, меняя
 * адрес внутри неё. Нераспознанная строка возвращается без изменений.
 */
export function normalizeIp(ip: string): string {
  const address = ip.replace(/%.*$/, '');
  const mapped = address.match(IPV4_MAPPED);
  if (mapped?.[1] && isIPv4(mapped[1])) return mapped[1];
  if (isIPv4(address)) return address;
  if (!isIPv6(address)) return ip;
  return `${expandIPv6(address).slice(0, 4).join(':')}::/64`;
}

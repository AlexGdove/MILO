/**
 * IP клиента по тем же правилам, что Express при `app.set('trust proxy', N)` (пакет
 * proxy-addr): цепочка адресов — адрес соединения, затем `X-Forwarded-For` справа налево;
 * доверяем N ближайшим звеньям, клиент — следующее за ними (или последнее, если цепочка
 * короче). При `trustProxy = 0` заголовок не учитывается — иначе клиент подделает IP.
 *
 * Нужна там, где Express не участвует: WebSocket-рукопожатие видит только адрес соединения,
 * а за Caddy это адрес прокси — общий для всех пользователей.
 */
export function clientIp(
  remoteAddress: string | undefined,
  forwardedFor: string | string[] | undefined,
  trustProxy: number,
): string {
  const header = Array.isArray(forwardedFor) ? forwardedFor.join(',') : (forwardedFor ?? '');
  const forwarded = header
    .split(',')
    .map((address) => address.trim())
    .filter((address) => address.length > 0)
    .reverse();
  const chain = [remoteAddress ?? 'unknown', ...forwarded];
  return chain[Math.min(trustProxy, chain.length - 1)] ?? 'unknown';
}

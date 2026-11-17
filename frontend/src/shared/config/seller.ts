/**
 * Продавец — самозанятый (решение №76 п. 4). Реквизиты публикуются на сайте по решению владельца
 * 2026-11-17 (нужны ЮKassa и покупателям) и хранятся прямо в коде.
 * Пустое значение — реквизит ещё не указан: страницы показывают «уточняется».
 */
interface Seller {
  fullName: string;
  inn: string;
  email: string;
  status: string;
  site: string;
}

export const SELLER: Readonly<Seller> = {
  /** ФИО полностью */
  fullName: '',
  /** ИНН, 12 цифр */
  inn: '',
  /** Почта для обращений покупателей */
  email: '',
  status: 'Плательщик налога на профессиональный доход (самозанятый)',
  site: 'https://milo-app.ru',
};

/** Значение реквизита или «уточняется», если его ещё нет. */
export const sellerValue = (value: string): string => value.trim() || 'уточняется';

/**
 * Тарифы для страниц «Тарифы» и «Оферта» (решение №76): только помесячно, цены в рублях.
 * Лимиты на сервере задаются настройками (`PHOTO_AI_*`) — при их смене поправить и здесь.
 */
export interface Tariff {
  /** Внутреннее имя тарифа аккаунта (`Pro` — это `unlimited`) */
  id: 'free' | 'plus' | 'unlimited';
  name: string;
  /** Цена за месяц, ₽; 0 — бесплатно */
  pricePerMonth: number;
  /** Сколько распознаваний блюда по фото доступно */
  photoLimit: string;
}

export const TARIFFS: readonly Tariff[] = [
  { id: 'free', name: 'Бесплатный', pricePerMonth: 0, photoLimit: '3 распознавания в неделю' },
  { id: 'plus', name: 'Plus', pricePerMonth: 200, photoLimit: 'до 20 распознаваний в неделю' },
  { id: 'unlimited', name: 'Pro', pricePerMonth: 349, photoLimit: 'до 50 распознаваний в неделю' },
];

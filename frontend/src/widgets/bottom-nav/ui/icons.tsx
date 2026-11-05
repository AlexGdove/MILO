import type { SVGProps } from 'react';

/** Единый стиль иконок навигации: сетка 24, линия 1.75, скруглённые концы. Размер — из CSS (--icon-size). */
const base: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

/** «Сегодня» — тарелка: съеденное за день */
export const TodayIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
  </svg>
);

/** «Рецепты» — кастрюля с крышкой */
export const RecipesIcon = () => (
  <svg {...base}>
    <path d="M5 11h14v6a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z" />
    <path d="M3 11h2M19 11h2" />
    <path d="M6 8.5h12" />
    <path d="M12 6v2.5" />
  </svg>
);

/** «Кладовая» — банка */
export const PantryIcon = () => (
  <svg {...base}>
    <rect x="6" y="3" width="12" height="4" rx="1.5" />
    <path d="M7 7h10v11a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3z" />
    <path d="M10 12h4" />
  </svg>
);

/** «Покупки» — корзина */
export const ShoppingIcon = () => (
  <svg {...base}>
    <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 8H6.2" />
    <circle cx="10" cy="20" r="1.25" />
    <circle cx="17" cy="20" r="1.25" />
  </svg>
);

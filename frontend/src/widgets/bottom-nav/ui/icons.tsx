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

/** «Сегодня» — три столбика, мотив знака MILO */
export const HomeIcon = () => (
  <svg {...base}>
    <rect x="4" y="5" width="4" height="14" rx="2" />
    <rect x="10" y="10" width="4" height="9" rx="2" />
    <rect x="16" y="5" width="4" height="14" rx="2" />
  </svg>
);

export const DiaryIcon = () => (
  <svg {...base}>
    <rect x="5" y="3" width="14" height="18" rx="3" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </svg>
);

/** Кладовая/продукты — банка */
export const ProductsIcon = () => (
  <svg {...base}>
    <rect x="6" y="3" width="12" height="4" rx="1.5" />
    <path d="M7 7h10v11a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3z" />
    <path d="M10 12h4" />
  </svg>
);

/** Покупки — корзина */
export const ShoppingIcon = () => (
  <svg {...base}>
    <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.6a2 2 0 0 0 2-1.5L20.5 8H6.2" />
    <circle cx="10" cy="20" r="1.25" />
    <circle cx="17" cy="20" r="1.25" />
  </svg>
);

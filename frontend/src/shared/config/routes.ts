export const ROUTES = {
  dashboard: '/',
  recipes: '/recipes',
  recipe: '/recipes/:id',
  pantry: '/pantry',
  shopping: '/shopping',
  profile: '/profile',
} as const;

/** Адрес страницы конкретного рецепта. */
export const recipePath = (id: string) => `/recipes/${encodeURIComponent(id)}`;

/** Старые адреса, которые перенаправляются на новые (закладки пользователей). */
export const LEGACY_ROUTES = {
  products: '/products',
  /** Раздел «Дневник» убран (решение №24): записи о съеденном — на «Сегодня» */
  diary: '/diary',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

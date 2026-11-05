export const ROUTES = {
  dashboard: '/',
  recipes: '/recipes',
  recipe: '/recipes/:id',
  pantry: '/pantry',
  profile: '/profile',
  /** Установка и скачивание приложения (решение №28) */
  app: '/app',
  /** Первый запуск: приветствие и анкета (решение №30) */
  welcome: '/welcome',
} as const;

/** «Покупки» — вкладка кладовой (решение №28). */
export const SHOPPING_PATH = `/pantry?tab=shopping`;

/** Адрес страницы конкретного рецепта. */
export const recipePath = (id: string) => `/recipes/${encodeURIComponent(id)}`;

/** Старые адреса, которые перенаправляются на новые (закладки пользователей). */
export const LEGACY_ROUTES = {
  products: '/products',
  /** Раздел «Дневник» убран (решение №24): записи о съеденном — на «Сегодня» */
  diary: '/diary',
  /** Отдельная страница покупок стала вкладкой кладовой (решение №28) */
  shopping: '/shopping',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

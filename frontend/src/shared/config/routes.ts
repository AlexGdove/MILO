export const ROUTES = {
  dashboard: '/',
  diary: '/diary',
  pantry: '/pantry',
  shopping: '/shopping',
  profile: '/profile',
} as const;

/** Старые адреса, которые перенаправляются на новые (закладки пользователей). */
export const LEGACY_ROUTES = {
  products: '/products',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

export const ROUTES = {
  dashboard: '/',
  diary: '/diary',
  products: '/products',
  profile: '/profile',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];

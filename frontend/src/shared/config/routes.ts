export const ROUTES = {
  dashboard: '/',
  recipes: '/recipes',
  recipe: '/recipes/:id',
  pantry: '/pantry',
  profile: '/profile',
  /** Установка и скачивание приложения (решение №28) */
  app: '/app',
  /** Настройки (из «Профиля», решение №43): оформление, язык, техподдержка */
  settings: '/settings',
  /** Техподдержка: свои обращения и новое (решение №43) */
  support: '/settings/support',
  /** Переписка по обращению */
  supportTicket: '/settings/support/:id',
  /** Первый запуск: приветствие и анкета (решение №30) */
  welcome: '/welcome',
} as const;

/**
 * Разделы нижней навигации по порядку — и для вкладок, и для свайпа влево-вправо между
 * страницами (свайп влево — следующий раздел).
 */
export const MAIN_SECTIONS = [
  ROUTES.dashboard,
  ROUTES.recipes,
  ROUTES.pantry,
  ROUTES.profile,
] as const;

/**
 * Свежая сборка Android-приложения (решение №46): workflow «Android APK» после каждой сборки
 * заменяет файл в релизе GitHub `android-latest` — ссылка постоянная, скачивается без входа.
 */
export const ANDROID_APK_URL =
  'https://github.com/AlexGdove/MILO/releases/download/android-latest/milo.apk';

/** «Покупки» — вкладка кладовой (решение №28). */
export const SHOPPING_PATH = `/pantry?tab=shopping`;

/** Адрес переписки по обращению в поддержку. */
export const supportTicketPath = (id: string) => `/settings/support/${encodeURIComponent(id)}`;

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

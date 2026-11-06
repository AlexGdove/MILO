/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Адрес API (shared/api); без него в разработке — /api/v1 через прокси Vite */
  readonly VITE_API_URL?: string;
  /** Версия приложения из package.json (vite.config, решение №48) */
  readonly VITE_APP_VERSION: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

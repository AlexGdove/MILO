import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

// vite.config — функция от режима (mobile отключает PWA); тесты — режим test
export default mergeConfig(
  viteConfig({ mode: 'test', command: 'serve' }),
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
      restoreMocks: true,
      unstubGlobals: true,
      // vi.stubEnv (VITE_API_URL в тестах API) сбрасывается после каждого теста
      unstubEnvs: true,
    },
  }),
);

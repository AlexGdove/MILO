import { defineConfig, mergeConfig } from 'vitest/config';

import viteConfig from './vite.config.ts';

export default mergeConfig(
  viteConfig,
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

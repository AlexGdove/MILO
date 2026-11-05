// Jest в режиме ES-модулей: NestJS 12 публикуется только как ESM (решение B-12).
// Запуск — `node --experimental-vm-modules …/jest.js` (скрипт `test` в package.json).

/** @type {import('jest').Config['projects'][number]} */
const base = {
  testEnvironment: 'node',
  rootDir: '.',
  extensionsToTreatAsEsm: ['.ts'],
  // Импорты в исходниках пишутся с .js (NodeNext) — для ts-jest убираем расширение
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  setupFiles: ['reflect-metadata'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.json' }],
  },
};

/** @type {import('jest').Config} */
export default {
  projects: [
    { ...base, displayName: 'unit', roots: ['<rootDir>/src'], testRegex: '.*\\.spec\\.ts$' },
    { ...base, displayName: 'e2e', roots: ['<rootDir>/test'], testRegex: '.*\\.e2e-spec\\.ts$' },
  ],
};

// Jest в режиме ES-модулей: NestJS 12 публикуется только как ESM (решение B-12).
// Запуск — `node --experimental-vm-modules …/jest.js --runInBand` (скрипт `test` в package.json):
// e2e-тесты работают с одной тестовой базой, поэтому файлы выполняются по очереди.

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
    {
      ...base,
      displayName: 'e2e',
      roots: ['<rootDir>/test'],
      testRegex: '.*\\.e2e-spec\\.ts$',
      // Реальная PostgreSQL (milo_test): проверка имени, DATABASE_URL и миграции — один раз
      globalSetup: '<rootDir>/test/support/global-setup.js',
    },
  ],
};

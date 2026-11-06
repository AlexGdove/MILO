import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import boundaries from 'eslint-plugin-boundaries';
import importX from 'eslint-plugin-import-x';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/** Слои FSD сверху вниз: слой может импортировать только нижележащие. */
const FSD_LAYERS = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];
const SLICED_LAYERS = ['pages', 'widgets', 'features', 'entities'];

export default tseslint.config(
  { ignores: ['**/node_modules', '**/dist', '**/dev-dist', 'mobile', 'backend/src/generated'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Конфиги node-окружения (vite.config.ts, eslint.config.js)
  {
    files: [
      '*.{js,ts}',
      'scripts/**/*.{js,mjs}',
      'frontend/*.{js,ts}',
      'frontend/scripts/**/*.{js,mjs}',
      'backend/*.js',
      'backend/test/**/*.js',
      'backend/scripts/**/*.{js,mjs}',
    ],
    languageOptions: { globals: globals.node },
  },

  // Frontend (React)
  {
    files: ['frontend/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
      'import-x': importX,
      boundaries,
    },
    settings: {
      react: { version: 'detect' },
      'import-x/resolver': {
        typescript: { project: 'frontend/tsconfig.app.json' },
      },
      // eslint-plugin-boundaries читает резолвер из ключа import/resolver
      'import/resolver': {
        typescript: { project: 'frontend/tsconfig.app.json' },
      },
      'boundaries/include': ['frontend/src/**/*'],
      'boundaries/elements': [
        { type: 'app', pattern: 'frontend/src/app' },
        { type: 'pages', pattern: 'frontend/src/pages/*', capture: ['slice'] },
        { type: 'widgets', pattern: 'frontend/src/widgets/*', capture: ['slice'] },
        { type: 'features', pattern: 'frontend/src/features/*', capture: ['slice'] },
        { type: 'entities', pattern: 'frontend/src/entities/*', capture: ['slice'] },
        { type: 'shared', pattern: 'frontend/src/shared' },
      ],
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      'react/prop-types': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      'import-x/no-duplicates': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          pathGroupsExcludedImportTypes: ['builtin'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // FSD: слой импортирует только нижележащие слои; соседние слайсы одного слоя — запрещены
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: FSD_LAYERS.map((layer, index) => ({
            from: { element: { type: layer } },
            allow: { to: { element: { types: FSD_LAYERS.slice(index + 1) } } },
          })),
        },
      ],

      // FSD: импорт слайса — только через public API (index.ts)
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: SLICED_LAYERS.map((layer) => `@/${layer}/*/*`),
              message: 'FSD: импортируйте слайс только через его public API (index.ts).',
            },
            {
              group: ['@/shared/*/*'],
              message:
                'FSD: импортируйте сегмент shared через его index.ts (например, @/shared/ui).',
            },
            {
              group: [
                '../**/app/*',
                '../**/pages/*',
                '../**/widgets/*',
                '../**/features/*',
                '../**/entities/*',
                '../**/shared/*',
              ],
              message: 'FSD: для импорта из другого слоя используйте алиас @/.',
            },
          ],
        },
      ],
    },
  },

  // Backend (NestJS, Node.js, тесты — Jest)
  {
    files: ['backend/**/*.ts'],
    languageOptions: { globals: { ...globals.node, ...globals.jest } },
    plugins: { 'import-x': importX },
    rules: {
      // Nest внедряет зависимости по метаданным типов: импорт класса для конструктора
      // должен остаться значением, поэтому type-импорты здесь не навязываются
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-floating-promises': 'off',
      'import-x/no-duplicates': 'error',
      'import-x/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },

  prettier,
);

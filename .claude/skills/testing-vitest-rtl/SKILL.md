---
name: testing-vitest-rtl
description: Write and run MILO tests with Vitest and React Testing Library — unit tests for pure domain logic (nutrition, units, availability, cooking plans, migrations), Zustand store tests, component tests with user-event, mocking, coverage, regression tests, and TDD for business rules. Use this skill whenever code is added or changed in `frontend/`, a bug is fixed (add a regression test), or someone mentions tests, Jest, Vitest, RTL, coverage, mocks, or "does this work". The API is Jest-compatible, so Jest knowledge applies. Complements the general `testing-quality` skill.
---

# Vitest + React Testing Library in MILO

The user chose Vitest (Jest-compatible API, native to Vite) over Jest on 2026-11-04. Follow `testing-quality` for strategy; this skill covers the concrete setup and patterns.

## Verified facts (vitest.dev, testing-library.com, 2026-11-04)
- Current major: **Vitest 5** (docs v5.1). Requires **Vite ≥ 6.4 and Node ≥ 22.12** — MILO has Vite 8 and Node 22.23.
- `vitest.config.*` takes priority over `vite.config.*`; prefer `mergeConfig(viteConfig, defineConfig({ test: {...} }))` from `vitest/config` so the `@/` alias and plugins are shared.
- `test.environment: 'jsdom'` (install `jsdom`), `test.setupFiles`, per-file override `/** @vitest-environment jsdom */`.
- CSS: by default Vitest returns a proxy for CSS Modules (class names resolve, no real CSS). Keep that default — tests must not depend on styles.
- Coverage: `coverage.provider: 'v8'` (default), `coverage.thresholds`. Package name `@vitest/coverage-v8` (not confirmed on the fetched page — verify on install; it needs approval as a new dependency).
- Mocks: `vi.fn`, `vi.spyOn`, `vi.mock(path, factory)` (hoisted; use `vi.hoisted` for factory variables), `vi.useFakeTimers`, `vi.setSystemTime`, `vi.stubGlobal`, `vi.restoreAllMocks`.
- RTL query priority: `getByRole` → `getByLabelText` → `getByPlaceholderText` → `getByText` → `getByDisplayValue` → `getByAltText` → `getByTitle` → `getByTestId` (last resort). Use `screen`. `findBy*` for async.
- user-event v14: `const user = userEvent.setup()` inside each test before `render`; `await user.click(...)`, `await user.type(...)`. Don't render or set up in `before*` hooks.
- jest-dom matchers for Vitest: `import '@testing-library/jest-dom/vitest'` in the setup file (path not confirmed from fetched pages — verify after install).

## Setup (as planned in branch `test/vitest-setup`)
```ts
// frontend/vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    restoreMocks: true,
    include: ['src/**/*.test.{ts,tsx}'],
  },
}));
```
`src/test/setup.ts`: jest-dom import, `afterEach(() => { cleanup(); localStorage.clear(); })`. Shared helpers (`renderWithRouter`, store reset, factories like `makeProduct()`) live in `src/test/` — test code is exempt from FSD slice rules but must not be imported by app code.
The PWA plugin in `vite.config.ts` may need disabling under test (`process.env.VITEST`) if it slows or breaks runs.

## What to test in MILO (priority order)
1. **Pure domain logic** — fastest and most valuable: `shared/lib/nutrition`, `units`, `entities/recipe/lib/checkAvailability`, `features/cook-recipe/model/planCooking`, persist `migrate` functions. Table-driven tests (`it.each`) for edge cases: zero/negative amounts, unit conversions, missing products, servings multiplier, stock exactly equal to requirement.
2. **Store actions** — `useXStore.getState().action()` then assert `getState()`; reset store and `localStorage` in `beforeEach`.
3. **Components/flows** — user-visible behavior with RTL: form validation messages, adding a meal updates the totals, cooking dialog lets the user choose "в покупки" vs "без него". Assert text/roles in Russian as the user sees them.
4. **Regression** — every bug fix gets a test that fails before the fix.

## Rules
- Test behavior, not implementation: no assertions on class names, internal state, or hook call counts.
- Deterministic: fake time (`vi.setSystemTime`) for anything date-based (`todayIsoDate`, meal type suggestion); stub `crypto.randomUUID` only if ids are asserted.
- Native `<dialog>`: jsdom lacks full `showModal` support — stub `HTMLDialogElement.prototype.showModal/close` in setup if `Modal` is rendered.
- Don't weaken assertions or `skip` tests to make a run green; report failures honestly.
- Coverage is a signal, not a goal — no tests written only to raise a percentage.

## Commands
- `npm test` (root → `vitest run` in frontend) for CI/verification; `npx vitest` (watch) while developing; `npx vitest run src/entities/recipe` to scope.
- Report the exact command, pass/fail counts, and anything not executed.

## Sources (read 2026-11-04)
https://vitest.dev/guide/ · /config/ (environment, css, coverage, setupfiles) · /api/vi · https://testing-library.com/docs/react-testing-library/intro/ · /docs/queries/about#priority · /docs/user-event/intro

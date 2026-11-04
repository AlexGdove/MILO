---
name: zustand-state
description: Design, write, review, and migrate Zustand stores in MILO — client state, persisted local data (pantry, diary, recipes, shopping list), selectors, slices, persist version migrations, and hydration. Use this skill whenever a task touches a `create(...)` store, `persist` middleware, `useXStore` hooks, selectors, store shape changes, data that must survive reloads, or a question like "where should this state live?" — even if Zustand is not named. Do not introduce Redux or Redux Toolkit.
---

# Zustand state in MILO

MILO keeps client-owned data in Zustand stores that persist to the browser. Server data (once a backend exists) belongs to TanStack Query, not Zustand — see the `tanstack-query` skill. Never add Redux/RTK unless the user explicitly asks.

Installed version (verified from `node_modules/zustand/package.json`, 2026-11-04): **zustand 5.0.16**. Re-check the installed version before relying on a newer API.

## Where stores live (FSD)
- Domain data → `frontend/src/entities/<entity>/model/store.ts` (e.g. `entities/product`, `entities/meal-entry`, `entities/user-goal`).
- Feature-local UI state that several components of one feature share → `features/<feature>/model/store.ts` (e.g. `features/select-date`).
- Component-only state stays in `useState`. Do not lift state into a store "just in case".
- Export the hook and selectors only through the slice's `index.ts`. Other slices never import `model/store` directly (ESLint `boundaries` + `no-restricted-imports` enforce this).
- Cross-entity operations (cook a recipe → deduct pantry → add to shopping list) live in a **feature** that calls actions of several entity stores. An entity store never imports another entity.

## Persistence rules
Always persist through the shared storage adapter so the storage backend can change in one place:

```ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { persistStorage, storageKey } from '@/shared/lib';

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({ /* state + actions */ }),
    {
      name: storageKey('products'),   // -> "milo:products" (legacy "calorie-tracker:" is migrated in shared/lib/storage)
      storage: persistStorage,
      version: 2,
      migrate: (persisted, version) => migrateProducts(persisted, version),
      partialize: (state) => ({ products: state.products }), // persist data, not actions/derived values
    },
  ),
);
```

Persist option names verified against `zustand/middleware/persist` types in 5.0.16: `name`, `storage`, `partialize`, `onRehydrateStorage`, `version`, `migrate(persistedState: unknown, version: number)`, `merge`, `skipHydration`. Store API: `useStore.persist.hasHydrated()`, `.onFinishHydration(fn)`, `.onHydrate(fn)`, `.rehydrate()`, `.clearStorage()`, `.getOptions()`.

### Changing a persisted shape
Users already have data in localStorage. A shape change without migration silently corrupts or drops it.
1. Bump `version`.
2. Write `migrate` as a pure function in `model/migrations.ts` that handles **every** older version step by step (`if (version < 2) …; if (version < 3) …`).
3. Treat `persistedState` as `unknown`; validate/normalize instead of casting blindly.
4. Add a unit test per version step (see `testing-vitest-rtl`).

### Hydration
localStorage hydration is synchronous, so most screens are fine. If an async storage is introduced later, gate UI on `persist.hasHydrated()` and show `shared/ui` Skeleton instead of an empty state that flashes.

## Selectors and re-renders
- Select the smallest value a component needs: `useProductStore((s) => s.adjustStock)`.
- A selector must not build a new object/array on every call, or the component re-renders on every store change (and React may warn about an infinite loop). Either select primitives separately, or wrap with `useShallow`:
  ```ts
  import { useShallow } from 'zustand/react/shallow';
  const { stock, unit } = useProductStore(useShallow((s) => ({ stock: s.byId[id]?.stock, unit: s.byId[id]?.unit })));
  ```
- Derived lists (filtering by date, availability checks) go in `useMemo` over a stable slice of state, or in pure functions in `lib/` that components call — keep business rules out of JSX.
- Export reusable selectors (`selectProducts`, `selectProductById(id)`) next to the store.

## Actions
- Actions live inside the store and are the only way to mutate it. Return useful values (created entity, removed entity) when callers need them for follow-up work — e.g. `removeEntry` returns the removed entry so the feature can restore stock.
- Keep updates immutable (`map`/`filter`/spread). Never mutate `get()` results.
- Clamp invariants in the action (stock never below 0, rounding) rather than in every caller.
- IDs via `createId()` from `@/shared/lib`; timestamps via `Date.now()` (inject/mock in tests).

## Slices
Use the slices pattern only when one store genuinely grows several independent concerns; separate stores per entity are the default in MILO. Typed slice signature: `StateCreator<CombinedState, [], [], SliceState>`; with middleware, list the mutators (e.g. `[['zustand/persist', unknown]]`). (Slices typing from memory of the v4/v5 docs — the official page returned 404 on 2026-11-04; check `zustand/vanilla` types before relying on mutator tuples.)

## Testing stores
- Reset between tests: capture `const initial = useXStore.getState()` once and call `useXStore.setState(initial, true)` in `beforeEach`; clear `localStorage`.
- Test actions through `useXStore.getState().action(...)` and assert on `getState()`; test migrations as pure functions.

## Checklist before finishing
- [ ] Store in the right FSD layer, exported via `index.ts`
- [ ] Persisted through `persistStorage` + `storageKey`, `partialize` excludes actions
- [ ] Shape change → version bump + tested `migrate`
- [ ] Selectors return stable values
- [ ] `npm run lint && npm run typecheck && npm test`

## Sources
- Installed type definitions: `node_modules/zustand/esm/middleware/persist.d.mts`, `esm/react/shallow.d.mts` (v5.0.16)
- https://zustand.docs.pmnd.rs (pages for persist/useShallow/slices returned 404 on 2026-11-04; re-check when updating this skill)

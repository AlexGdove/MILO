---
name: tanstack-query
description: Server state and data fetching with TanStack Query (React Query) for MILO — query/mutation hooks, query key architecture, caching, invalidation, optimistic updates, pagination, infinite queries, error and loading states, and syncing server data with local Zustand data. Use this skill whenever a task involves fetching from the backend or an external recipe API, `useQuery`/`useMutation`/`useInfiniteQuery`, QueryClient, cache invalidation, or "load more"/pagination — even if React Query is not named. It is not installed yet, so adding it is a stack change that needs the user's approval.
---

# TanStack Query in MILO

**Status (2026-11-04):** `@tanstack/react-query` is **not installed**. MILO currently stores everything locally (Zustand persist). Introduce TanStack Query only when real server data arrives (MILO backend, recipe API) and only after the user approves the dependency. Then install the current major and read its types — APIs below are from the v5 docs.

## Responsibility split
- **TanStack Query** owns data whose source of truth is a server: recipes from an API, community recipes, synced diary when a backend exists.
- **Zustand** (`zustand-state` skill) owns client-only state and offline-first local data. Do not copy query results into a Zustand store to "cache" them — the query cache is the cache. Exception: deliberate offline snapshots, which must have a clear sync rule.

## Placement (FSD)
- `shared/api/` — HTTP client (`fetch` wrapper: base URL from `import.meta.env.VITE_API_URL`, JSON parsing, typed `ApiError`), no React.
- `entities/<entity>/api/` — key factory, `queryOptions` builders, query hooks, DTO → domain mappers.
- `features/<feature>/api/` — mutations for that user action (create recipe, cook, sync).
- `app/providers/` — one `QueryClient` + `QueryClientProvider` (and Devtools in dev only).
- Validate external responses at the boundary (mapper/guard); never trust API shapes.

## Query keys
Verified rules (query-keys guide): keys are top-level **arrays**, JSON-serializable, unique to the data; object key order does not matter, array order does; every variable the `queryFn` uses must be in the key.

Use a key factory per entity:
```ts
export const recipeKeys = {
  all: ['recipes'] as const,
  lists: () => [...recipeKeys.all, 'list'] as const,
  list: (filters: RecipeFilters) => [...recipeKeys.lists(), filters] as const,
  details: () => [...recipeKeys.all, 'detail'] as const,
  detail: (id: string) => [...recipeKeys.details(), id] as const,
};
```
Pair keys with `queryOptions({ queryKey, queryFn, staleTime })` so the same definition serves `useQuery`, `prefetchQuery`, and `getQueryData` with full typing.

## Queries
- Set `staleTime` deliberately per data type (recipe catalog: minutes; user data: shorter). v5 names: `gcTime` (formerly `cacheTime`), `isPending` (no data yet) vs `isFetching` (any request in flight).
- Render all states explicitly: pending → `shared/ui` Skeleton, error → message + retry button (`refetch`), empty → `EmptyState`, success.
- Use `select` for derived views instead of transforming in components.
- `enabled: Boolean(id)` for dependent queries; avoid request waterfalls by prefetching on navigation intent.

## Mutations and invalidation
- Invalidate with the object form: `queryClient.invalidateQueries({ queryKey: recipeKeys.lists() })`. Return the promise from `onSettled` so the mutation stays pending until the refetch completes (verified, optimistic-updates guide).
- Prefer invalidation over manual cache writes unless the server returns the full updated entity (then `setQueryData` for the detail key).

### Optimistic updates (cache approach)
Verified pattern: `onMutate` cancels in-flight queries, snapshots, writes the optimistic value and **returns the snapshot**; `onError` restores it; `onSettled` invalidates. The current docs pass an extra `context` argument (with `context.client`) to these callbacks — check the installed version's `useMutation` types; older v5 releases use the `queryClient` from `useQueryClient()` and `(err, variables, context)` in `onError`.
For simple cases prefer the UI approach: render `variables` while `isPending`.

## Pagination and infinite lists
- Paged: put `page` in the key, use `placeholderData: keepPreviousData` to avoid flashes.
- Infinite (verified): `useInfiniteQuery` requires `initialPageParam` and `getNextPageParam: (lastPage, allPages, lastPageParam) => next | undefined`; returns `data.pages`, `data.pageParams`, `fetchNextPage`, `hasNextPage`, `isFetchingNextPage`. `maxPages` bounds memory.
- Large infinite lists render with TanStack Virtual — see `tanstack-virtual` skill (trigger `fetchNextPage` when the last virtual item is near).

## Errors and retries
- Default `retry` is fine for GET; set `retry: false` for mutations that are not idempotent.
- Map HTTP errors to a typed `ApiError` in `shared/api`; show user-facing Russian messages, never raw server text.
- Do not put secrets/API keys in the frontend (`VITE_*` vars are public). A paid recipe API must be proxied through the backend.

## Testing
- New `QueryClient` per test with `defaultOptions: { queries: { retry: false } }`, wrap with a provider helper.
- Mock at the network/`shared/api` boundary, not the hooks. Assert visible states with RTL (`findBy*`).

## Sources (read 2026-11-04)
- https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
- https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates
- https://tanstack.com/query/latest/docs/framework/react/guides/infinite-queries
- Not confirmed from fetched pages (known v5 API, verify on install): `queryOptions`, `gcTime`, `isPending`, `keepPreviousData`.

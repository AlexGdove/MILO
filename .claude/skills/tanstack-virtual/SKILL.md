---
name: tanstack-virtual
description: Virtualize long lists and tables in MILO with TanStack Virtual — pantry and product catalogs, diary history, recipe lists, shopping lists, search results, dynamic item heights, window (page) scrolling, and infinite scrolling with TanStack Query. Use this skill whenever a list can grow to hundreds of rows, scrolling feels slow, or someone asks about virtualization, windowing, react-window, or rendering large datasets — even if TanStack Virtual is not named. It is not installed yet, so adding it needs the user's approval.
---

# TanStack Virtual in MILO

**Status (2026-11-04):** `@tanstack/react-virtual` is **not installed**. Current MILO lists are small (dozens of items) and render plainly. Propose virtualization only when a list realistically exceeds ~200 rows or profiling shows a problem, and get approval for the dependency first. Don't virtualize short lists: it costs accessibility (find-in-page, screen-reader list size) and complexity.

## Choose the virtualizer
- MILO pages scroll the **window** (mobile layout, fixed bottom nav) → use `useWindowVirtualizer`.
- A list inside its own scroll box (bottom-sheet product picker in `features/add-meal-entry`) → `useVirtualizer` with `getScrollElement: () => parentRef.current`.

## Verified API (virtualizer + react-virtual docs)
- Required: `count`, `estimateSize: (index) => number`, and `getScrollElement` (not for the window variant).
- Useful options: `overscan` (default 1 — raise to ~5 on mobile), `getItemKey` (use the entity id, memoized), `gap`, `scrollMargin`, `paddingStart/End`, `horizontal`, `lanes`, `enabled`.
- Instance: `getVirtualItems()`, `getTotalSize()`, `measureElement`, `scrollToIndex(i, { align, behavior })`, `scrollToOffset`, `measure()`.
- React option `useFlushSync` (default `true`); set `false` if you see flushSync warnings during render.

## Pattern (window scroll, dynamic heights)
```tsx
const listRef = useRef<HTMLUListElement>(null);
const virtualizer = useWindowVirtualizer({
  count: items.length,
  estimateSize: () => 72,            // close to the largest realistic row
  overscan: 6,
  scrollMargin: listRef.current?.offsetTop ?? 0,
  getItemKey: (index) => items[index]!.id,
});

<ul ref={listRef} style={{ position: 'relative', height: virtualizer.getTotalSize() }}>
  {virtualizer.getVirtualItems().map((row) => (
    <li
      key={row.key}
      data-index={row.index}                 // required for measureElement
      ref={virtualizer.measureElement}
      style={{ position: 'absolute', top: 0, left: 0, width: '100%',
               transform: `translateY(${row.start - virtualizer.options.scrollMargin}px)` }}
    >
      <ProductCard product={items[row.index]!} />
    </li>
  ))}
</ul>
```
(`data-index` + `ref={measureElement}` and subtracting `scrollMargin` are verified from the docs.)

Keep positioning values in inline style (they are computed per row); everything visual stays in CSS Modules with tokens.

## Infinite scrolling
Combine with `useInfiniteQuery` (see `tanstack-query`): flatten `data.pages`, set `count = hasNextPage ? rows.length + 1 : rows.length`, render a loader row for the extra index, and in an effect call `fetchNextPage()` when the last virtual item index ≥ `rows.length - 1` and `!isFetchingNextPage`.

## Tables
Virtualize rows only; keep a real `<table>` semantics where possible (`role="table"` structure if rows become absolutely positioned divs) and a sticky header outside the virtualized body.

## Accessibility and UX
- Keep `<ul>/<li>` semantics; add `aria-setsize`/`aria-posinset` on rows when the full count matters.
- Preserve keyboard focus: when focus moves to an off-screen item, `scrollToIndex` first.
- Restore scroll position on back-navigation if users return to long lists.
- Test on a real mobile viewport (390×844) — the bottom nav overlaps the last rows; add `paddingEnd` equal to nav height.

## Testing
jsdom has no layout, so virtual lists render ~0 items there. Unit-test data logic separately; verify the virtualized UI in the browser smoke test (Playwright/Edge) or mock `getBoundingClientRect`/`offsetHeight` deliberately.

## Sources (read 2026-11-04)
- https://tanstack.com/virtual/latest/docs/api/virtualizer
- https://tanstack.com/virtual/latest/docs/framework/react/react-virtual
- Current major version not stated on those pages — check npm/types when installing.

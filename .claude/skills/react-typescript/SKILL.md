---
name: react-typescript
description: Build, refactor, and explain React and TypeScript frontend code using the conventions and dependencies already established in this repository.
---

# React and TypeScript Development

Act as a Senior Frontend Engineer. Follow the project's existing architecture and conventions before introducing new patterns.

## Repository-first rules
- Inspect `package.json`, TypeScript configuration, bundler configuration, routing, state management, styling, and nearby examples before coding.
- Use the React and TypeScript versions already installed. Do not upgrade dependencies as part of an unrelated task.
- Match existing naming, file organization, import aliases, formatting, and error-handling conventions.
- Do not assume a particular state library, router, component library, or data-fetching tool.

## React practices
- Prefer function components and hooks consistent with the project's React version.
- Keep components focused; extract logic when it improves reuse, testing, or readability.
- Respect hook rules and component lifecycle semantics.
- Avoid unnecessary effects. Derive values during render when possible; use effects for synchronization with external systems.
- Keep UI state local unless it genuinely needs to be shared.
- Handle loading, empty, error, and success states explicitly.
- Use stable keys and avoid mutating state.
- Avoid premature memoization; use memoization when it addresses a measured or clear rendering concern.

## TypeScript practices
- Prefer precise types, discriminated unions, and inference where appropriate.
- Avoid `any`, unsafe assertions, non-null assertions, and `@ts-ignore`. If unavoidable, explain and isolate the reason.
- Treat external data as untrusted; validate at the boundary.
- Keep API DTOs and domain/UI models distinct when their responsibilities differ.
- Do not duplicate shared API contracts if an authoritative shared contract package exists.

## Quality
- Preserve accessibility: semantic HTML, labels, keyboard interaction, focus behavior, and appropriate ARIA.
- Avoid embedding business rules in presentation components.
- Keep components testable and avoid coupling tests to implementation details.
- Follow existing styling and design-system conventions.

## Before finishing
Run the most relevant lint, type-check, and test commands available in the repository. Report exact commands and outcomes. If a command cannot run, state why; never imply it passed.

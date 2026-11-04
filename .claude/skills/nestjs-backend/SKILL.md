---
name: nestjs-backend
description: Build and review the MILO backend with Node.js and NestJS — modules, controllers, providers and dependency injection, DTOs and validation, pipes/guards/interceptors/middleware/filters, REST API design, auth, configuration, logging, database integration, OpenAPI docs, and backend tests. Use this skill for any work in `backend/`, any API endpoint, or questions about server-side architecture, even if NestJS is not named. Complements the general `backend-engineering` skill. NestJS is not chosen yet, so scaffolding it needs the user's approval.
---

# NestJS backend for MILO

**Status (2026-11-04):** `backend/` is a placeholder (README only). The stack is **not approved** yet; NestJS is the leading candidate. Do not scaffold or install anything in `backend/` until the user approves the stack and database. Then follow `backend-engineering` for general rules and this skill for NestJS specifics.

## Facts verified from docs.nestjs.com (2026-11-04)
- Current docs are for the release after v11 (inferred v12; check `npm view @nestjs/core version`).
- Runtime: Node ≥ 20.19 (or ≥ 22.12 on 22.x). CLI generators need Node ≥ 22.22.3 / 24.15 / 26. MILO machine has Node 22.23 — OK.
- `nest new` asks for a module system: **ESM (default) uses Vitest**, CommonJS uses Jest. Choose ESM so frontend and backend share Vitest (see `testing-vitest-rtl`).
- Default platform: Express (`@nestjs/platform-express`).

## Monorepo placement
- `backend/` becomes an npm workspace (`"workspaces": ["frontend", "backend"]`) with its own `package.json`, `tsconfig`, lint and tests.
- The frontend never imports backend code. Share only API contracts through an explicit package (e.g. `packages/contracts` with DTO types/schemas) if and when it is approved.

## Module structure (domain-oriented)
```
backend/src/
  main.ts                 bootstrap: global ValidationPipe, config, Swagger, CORS for the PWA origin
  app.module.ts
  config/                 typed config (registerAs) + env validation
  common/                 filters, interceptors, guards, decorators shared across modules
  products/  recipes/  meal-entries/  shopping/  users/  auth/
    <name>.module.ts
    <name>.controller.ts  HTTP only: routing, DTOs, status codes
    <name>.service.ts     use cases and business rules
    <name>.repository.ts  data access (ORM calls) — the only place that touches the DB
    dto/                  create/update/query DTOs with class-validator
    entities/ or schema   persistence models
```
Business rules that the PWA currently runs locally (stock deduction, availability check, cooking plan) must become authoritative on the server once sync exists — port them as services with tests, keep the client versions as optimistic previews.

## Request lifecycle (verified)
Middleware (global → module) → Guards (global → controller → route) → Interceptors pre (global → controller → route) → Pipes (global → controller → route → param) → handler → service → Interceptors post (route → controller → global) → Exception filters (route → controller → global, only on uncaught exceptions). Put each concern at the right stage: auth in guards, validation in pipes, response shaping/logging/timing in interceptors, error mapping in filters.

## Validation and DTOs
- `npm i class-validator class-transformer`; global `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))`.
- One DTO per input shape; derive update DTOs with `PartialType` from `@nestjs/swagger` (not `@nestjs/mapped-types`) when Swagger is used.
- Never return persistence entities directly; map to response DTOs (no password hashes, internal ids only if intended).
- `StandardSchemaValidationPipe` exists for Zod/Valibot if the project picks schema-first contracts.

## Configuration
- `@nestjs/config`: `ConfigModule.forRoot({ isGlobal: true, validate })`; namespaced config via `registerAs('db', …)` and inject `ConfigType<typeof dbConfig>`.
- Runtime env vars override `.env` unless `override: true`. Never commit `.env`; provide `.env.example`.

## REST conventions
- Plural resources, `/api/v1` prefix, `GET /recipes?cursor=&limit=` cursor pagination, `POST` create → 201, `PATCH` partial update, `DELETE` → 204.
- Consistent error body from a global exception filter: `{ statusCode, error, message, details? }` — no stack traces in production.
- Idempotency for operations that clients may retry offline (e.g. "cook recipe" with a client-generated operation id).

## Auth (when approved)
Server-side authorization on every resource (`userId` scoping in repositories), guards for authentication, never trust client-sent user ids. Passwords hashed with a vetted library; tokens short-lived. Provider choice needs approval.

## Logging and errors
Use Nest `Logger` (or the approved structured logger) with request ids from an interceptor/middleware; never log tokens, passwords or personal nutrition data in full.

## OpenAPI
`@nestjs/swagger`: `DocumentBuilder().setTitle('MILO API')…build()`, `SwaggerModule.setup('api/docs', app, () => SwaggerModule.createDocument(app, config))`. Generated JSON can feed typed frontend clients later.

## Testing (verified patterns)
- Unit: `Test.createTestingModule({ providers: [RecipesService, { provide: RecipesRepository, useValue: repoMock }] }).compile()`; `moduleRef.get(...)`; `useMocker(...)` for auto-mocks.
- E2E (`test/*.e2e-spec.ts`): `.overrideProvider(X).useValue(...)`, `app = moduleRef.createNestApplication(); await app.init();` then `request(app.getHttpServer())` with supertest; `await app.close()` in `afterAll`. Register global enhancers via `useExisting` so tests can override them.
- Test business rules and authorization paths, not framework wiring.

## Before finishing
Run backend lint, typecheck, unit and e2e tests, and a production build. Report exact commands and results; flag any migration or API-contract change explicitly.

## Sources (read 2026-11-04)
https://docs.nestjs.com/first-steps · /application/validation · /application/configuration · /fundamentals/testing · /openapi/introduction · /faq/request-lifecycle
Unconfirmed: exact NestJS major number; supertest install command (`npm i -D supertest @types/supertest`).

---
name: backend-engineering
description: Design, implement, review, and refactor backend services, APIs, persistence, authentication, and server-side business logic using the project's existing stack.
---

# Backend Engineering

Act as a Senior Backend Engineer. First discover the actual backend framework, runtime, database, ORM, and conventions. Do not assume a stack.

## Boundaries
- Backend is the authoritative owner of server-side business rules, persistence, authorization, and integrations.
- Keep transport concerns (HTTP/controllers/routes) separate from application use cases and domain rules where the project's scale justifies it.
- Keep database access behind the repository/data-access conventions already used by the project.
- Do not let Web or Mobile import backend internals. Expose behavior through documented interfaces.
- Share API contracts through an explicit, platform-neutral package or schema only when appropriate.

## API design
- Preserve existing routes, payloads, status codes, and error semantics unless a breaking change is approved.
- Validate and normalize input at trust boundaries.
- Return consistent, documented errors without leaking secrets or internal stack traces.
- Apply authentication and authorization on the server; never rely on client-side checks.
- Consider pagination, filtering, idempotency, rate limits, and timeouts where relevant.
- Keep API contracts explicit and version changes deliberately.

## Data and security
- Inspect schema and migration conventions before changing persistence.
- Make migrations safe, reviewable, and reversible where possible.
- Use transactions when operations must be atomic.
- Avoid logging credentials, tokens, personal data, or secrets.
- Use parameterized queries or the framework's safe query mechanisms.
- Apply least privilege and validate authorization at the resource/action level.
- Treat external service responses as untrusted input.

## Reliability
- Handle expected failures explicitly.
- Use structured logging and existing observability patterns.
- Avoid swallowing exceptions or returning success for failed operations.
- Consider retries only when operations are safe to retry.
- Keep background jobs and external integrations isolated behind clear interfaces.

## Before finishing
Run the relevant backend tests, type checks, lint, and build. Inspect changed migrations and API compatibility. Report what was actually run and any remaining risks.

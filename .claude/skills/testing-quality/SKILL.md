---
name: testing-quality
description: Plan, write, run, and improve automated tests and quality checks using the project's existing test frameworks and conventions.
---

# Testing and Quality Assurance

Act as a Senior QA-minded Software Engineer. Inspect the repository before choosing test tools or changing test configuration.

## Test strategy
- Identify the existing unit, integration, component, end-to-end, and contract test frameworks.
- Choose the narrowest test level that gives confidence, and add broader tests for critical cross-module behavior.
- Test observable behavior, edge cases, and failure paths.
- Avoid brittle tests coupled to internal implementation details.
- Keep tests deterministic; isolate time, randomness, network, and external services appropriately.
- Use fixtures and factories consistent with the project.
- Do not make tests pass by weakening assertions or skipping meaningful coverage.

## Application coverage
- Web: user-visible behavior, forms, navigation, loading/error states, and accessibility-critical interactions.
- Backend: validation, authorization, business rules, persistence behavior, API contracts, and failure handling.
- Mobile: navigation, lifecycle-sensitive behavior, permissions, offline/network states, and API integration where supported.
- Shared packages: contract compatibility, validation edge cases, and runtime compatibility.

## Quality gates
Use the project's actual scripts and CI configuration. Prefer existing commands for:
- Formatting.
- Linting.
- Type checking.
- Unit and integration tests.
- End-to-end tests.
- Production builds.

Do not introduce a new test framework without a clear gap and approval for the dependency/configuration change.

## Reporting
For each check, report:
- Exact command.
- Pass/fail/blocked status.
- Relevant failure summary.
- Whether the check was actually executed.

Never describe unrun checks as passing. Separate pre-existing failures from failures introduced by the current change when evidence allows.

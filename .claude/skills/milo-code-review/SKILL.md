---
name: milo-code-review
description: Review code changes for correctness, regressions, security, maintainability, architecture violations, and missing tests. Use when asked to review a diff, pull request, or implementation.
---

# Code Review

Act as an independent Senior Engineer reviewing the change—not as its author defending it.

## Review priorities
1. Correctness and functional regressions.
2. Security, privacy, and authorization issues.
3. Data integrity, concurrency, and failure handling.
4. API and backward compatibility.
5. Architecture boundaries and dependency direction.
6. Performance issues with a credible impact.
7. Maintainability and readability.
8. Missing or inadequate tests.

## Review method
- Inspect the diff and enough surrounding code to understand behavior.
- Trace relevant callers, consumers, and data flows.
- Check edge cases, null/undefined values, malformed input, race conditions, and error paths.
- Verify that tests cover changed behavior rather than merely implementation details.
- Distinguish definite defects from suggestions and uncertain concerns.
- Do not report stylistic preferences as bugs.

## Findings format
For each finding include:
- Severity: Critical, High, Medium, or Low.
- File and exact line/range when available.
- What is wrong.
- Why it matters / a concrete failure scenario.
- A concise recommended fix.

Order findings by severity. Lead with actionable defects. If no findings are identified, say so and mention what was not verified.

Do not modify code during a review unless explicitly asked to fix findings. Never claim to have executed tests unless you did.

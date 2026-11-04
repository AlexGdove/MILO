---
name: github-actions-ci
description: Create, maintain, secure, and debug GitHub Actions CI/CD for MILO — workflow YAML, triggers, jobs and matrices, npm caching, lint/typecheck/test/build pipelines, artifacts, deployments, permissions, secrets, concurrency, and failing-pipeline debugging. Use this skill whenever a task touches `.github/workflows/`, CI status checks, release or deploy automation, or someone asks why a pipeline failed — even if GitHub Actions is not named.
---

# GitHub Actions for MILO

MILO is an npm-workspaces monorepo (`frontend/` now, `backend/` later) with scripts at the root: `lint`, `typecheck`, `test`, `build`. CI must run exactly those — never a different set of checks than developers run locally.

## Action versions (from each action's README, 2026-11-04)
`actions/checkout@v7` · `actions/setup-node@v7` · `actions/upload-artifact@v7` · `actions/download-artifact@v8` · `actions/cache@v6`.
Re-check READMEs when editing workflows. Security docs recommend **pinning third-party actions to a full commit SHA** (`uses: owner/action@<sha> # vX.Y.Z`); first-party `actions/*` may use major tags if the user accepts that trade-off — state which you chose.

## Baseline CI workflow
```yaml
# .github/workflows/ci.yml
name: CI
on:
  pull_request:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read            # least privilege; unspecified scopes become none

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  verify:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version-file: .nvmrc      # 22
          cache: npm                     # caches ~/.npm keyed on package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
      - uses: actions/upload-artifact@v7
        with:
          name: frontend-dist
          path: frontend/dist
          retention-days: 7
          if-no-files-found: error
```
Notes: `setup-node` `cache: npm` + root `package-lock.json` covers workspaces; add `cache-dependency-path` only if lockfiles move. Use `npm ci`, never `npm install`, in CI. The workflow file and the `ci` status check become the required check in branch protection (see `git-github-workflow`).

## Security (verified from GitHub hardening guide)
- Default `GITHUB_TOKEN` to read-only contents; grant `write` per job only where needed (e.g. `pages: write`, `id-token: write` for deploy).
- **Script injection**: never interpolate untrusted context (`github.event.pull_request.title`, branch names, issue bodies) directly into `run:`. Pass via `env:` and quote: `env: TITLE: ${{ github.event.pull_request.title }}` → `run: echo "$TITLE"`.
- Avoid `pull_request_target` and `workflow_run` unless required; if used, never check out or execute fork code (checkout v7 refuses by default).
- Secrets: GitHub secrets only, never echo them; mask derived sensitive values with `::add-mask::`; don't store structured data (JSON) as a single secret; use environments with required reviewers for production secrets. `VITE_*` values end up in the public bundle — never put secrets there.
- Dependabot for `github-actions` and `npm` ecosystems keeps pinned versions current.

## Deployment (when approved)
Separate `deploy` job with `needs: verify`, `if: github.ref == 'refs/heads/main'`, `environment: production`, downloading the `frontend-dist` artifact. Target (GitHub Pages, Netlify, own server) is a product decision — ask first. PWA note: the service worker must be served from the site root with correct cache headers.

## Debugging a failing run
1. `gh run list --limit 5`, `gh run view <id> --log-failed` — read the first real error, not the last line.
2. Reproduce locally with the same Node version (`.nvmrc`) and `npm ci`.
3. Common causes here: lockfile out of sync (`npm ci` fails) → run `npm install` locally and commit the lockfile; OS differences (case-sensitive paths on Linux vs Windows — check import casing); missing env vars; timeouts.
4. Re-run with debug logging via the `ACTIONS_STEP_DEBUG` secret only if needed.
5. Fix forward in a `ci/…` branch; don't disable a failing step to get green.

## Validation before committing a workflow
- YAML parses (indentation with spaces), every `uses:` resolves to an existing version, `permissions` set, `timeout-minutes` set.
- Push to a branch and confirm the run passes before making it a required check.
- Changing CI or repository settings is outward-facing — confirm with the user.

## Sources (read 2026-11-04)
READMEs of actions/checkout, setup-node, upload-artifact, download-artifact, cache · https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions · https://docs.github.com/en/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions
Not confirmed from fetched text: `matrix`, `timeout-minutes` default (360), `environment` key details.

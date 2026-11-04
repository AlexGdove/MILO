---
name: git-github-workflow
description: Safe Git and GitHub workflow for MILO — branch-per-change, Conventional Commits, merging, pull requests, code review flow, conflict resolution, remotes, branch protection and rulesets, and repository hygiene. Use this skill before any git command that creates branches, commits, merges, rebases, pushes, resets, or deletes; when resolving conflicts; when preparing a PR; or when configuring GitHub repository settings — even for "just commit this".
---

# Git & GitHub workflow for MILO

## Project rules (from CLAUDE.md, section 11 of the user's requirements — they override everything below)
- Branches: `main` = stable, `dev` = integration. Every task gets a working branch **from `dev`**: `feat/…`, `fix/…`, `chore/…`, `refactor/…`, `docs/…`, `test/…`, `ci/…`. One logical change per branch.
- **Never touch `main`**: no merge, rebase, cherry-pick, push, or edits while `main` is checked out. Changes reach `main` only when tests, typecheck, lint, build and CI are green, the user has reviewed the results, **and** the user explicitly says to merge into `main`. Green CI alone is not permission.
- **Ask first, every time**: commits, merges into `dev`, pushes, creating/switching/deleting branches outside the agreed scheme, any history rewrite, repository or branch-protection settings. Force-push is forbidden.
- Before any task: `git branch --show-current` and `git status --short`; if on `main`, stop and switch only with permission.
- Before asking to commit or merge: run `npm run lint && npm run typecheck && npm test && npm run build`, show the diff summary and the results (test counts: total/passed/failed/skipped). A failing check blocks the request.
- Merge into `dev` (after permission): `git checkout dev && git merge --no-ff <branch> -m "Merge branch '<branch>' into dev"`. With a GitHub remote, open a PR to `dev` instead.
- Never commit secrets, `.env`, `node_modules`, `dist`. End commit messages with the attribution line given in the session's system reminder, if any.

## Commit messages — Conventional Commits 1.0.0 (verified)
`<type>[optional scope]: <description>`, optional body, optional footers.
- Types: `feat` (minor), `fix` (patch), plus `build`, `chore`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`, `revert`.
- Breaking change: `!` after type/scope (`feat(api)!: …`) or footer `BREAKING CHANGE: <description>`.
- Scope = area: `frontend`, `backend`, `pantry`, `recipes`, `shopping`, `brand`, `skills`.
- Description in imperative mood, ≤ 72 chars; body explains *why* and lists notable changes.

## Safety: destructive operations need explicit permission
Ask the user before any of: `git reset --hard`, `git checkout -- <path>` / `git restore` on uncommitted work, `git clean -fd`, `git branch -D`, `git push --force*`, rebasing shared/pushed branches, `git stash drop/clear`, amending pushed commits, deleting remote branches, rewriting history (`filter-repo`).
- If a force push is approved, use `--force-with-lease` (refuses if the remote moved since your last fetch; note: a background `git fetch` can defeat the lease — consider `--force-if-includes`).
- Before overwriting anything, inspect it: `git status`, `git diff`, `git log --oneline -10`, `git stash list`.
- Never skip hooks (`--no-verify`) or signing unless the user asks.
- Interactive commands (`rebase -i`, `add -i`) are unavailable in this environment — use non-interactive equivalents.

## Everyday flow
```bash
git branch --show-current && git status --short   # never start on main
git checkout dev && git pull --ff-only             # pull only if a remote exists
git checkout -b feat/shopping-list                 # branch from dev
# …work, write tests, run lint/typecheck/test/build, report…
# ask the user → only then:
git add <specific paths>           # avoid blind `git add -A` when unrelated files are dirty
git commit -m "feat(shopping): add shopping list entity and page"
# ask again before merging into dev
```
Prefer new commits over `--amend`. Keep generated files (icons from `generate-icons.mjs`) committed only when they are product assets.

## Conflicts
1. `git status` to list conflicted files; read both sides fully before editing.
2. Resolve by intent, not by picking "ours/theirs" wholesale; for `package-lock.json` re-run `npm install` after resolving `package.json`.
3. Re-run lint/typecheck/tests before concluding the merge.
4. If unsure which side is right, stop and ask — never discard someone else's change silently.

## Pull requests (when a GitHub remote exists — use `gh`)
- Only with permission: `git push -u origin <branch>` then `gh pr create --base dev --title "<conventional title>" --body-file …`. A PR `dev → main` is opened only when the user asks for a release to `main`.
- Body: summary, motivation, screenshots for UI (light + dark), test plan with exact commands, risks; end with the attribution line from the system reminder if present.
- Don't `@mention` people/roles unless intended (GitHub notifies them); put placeholders in backticks.
- Review with `milo-code-review` before requesting human review; address findings with new commits.
- Merge strategy: merge commit (`--no-ff`) to keep branch history, matching the local convention, unless the repo settings say otherwise.

## Branch protection / rulesets (verified options)
Recommend for `main` (and similar, lighter rules for `dev`): require PR before merging (≥ 1 approval, dismiss stale approvals), require status checks (CI job from `github-actions-ci`), require conversation resolution, block force pushes and deletions (default), optionally require linear history or merge queue. Rulesets can layer; the most restrictive rule wins. Changing repository settings is outward-facing — confirm with the user first.

## Windows notes
`.gitattributes` forces LF (`* text=auto eol=lf`); `core.autocrlf=false` in this repo. The repo path contains Cyrillic and spaces — always quote it.

## Sources (read 2026-11-04)
https://www.conventionalcommits.org/en/v1.0.0/ · https://git-scm.com/docs/git-push · https://docs.github.com/…/about-protected-branches · https://docs.github.com/…/about-rulesets

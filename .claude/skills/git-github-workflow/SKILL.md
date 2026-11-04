---
name: git-github-workflow
description: Safe Git and GitHub workflow for MILO — branch-per-change, Conventional Commits, merging, pull requests, code review flow, conflict resolution, remotes, branch protection and rulesets, and repository hygiene. Use this skill before any git command that creates branches, commits, merges, rebases, pushes, resets, or deletes; when resolving conflicts; when preparing a PR; or when configuring GitHub repository settings — even for "just commit this".
---

# Git & GitHub workflow for MILO

## Project rules (from CLAUDE.md — they override generic advice)
- **Every change goes in a new branch** from up-to-date `main`: `feat/…`, `fix/…`, `chore/…`, `refactor/…`, `docs/…`, `test/…`, `ci/…`. One logical change per branch.
- Before merging: `npm run lint && npm run typecheck && npm test && npm run build` all pass (report exact results).
- Local merge: `git checkout main && git merge --no-ff <branch> -m "Merge branch '<branch>'"`. With a GitHub remote, prefer a PR instead (below).
- Commit only when the user asked for the work; never commit secrets, `.env`, `node_modules`, `dist`.
- End commit messages with the attribution line given in the session's system reminder, if any.

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
git status --short                 # clean tree?
git checkout main && git pull --ff-only   # if a remote exists
git checkout -b feat/shopping-list
# …work, run checks…
git add <specific paths>           # avoid blind `git add -A` when unrelated files are dirty
git commit -m "feat(shopping): add shopping list entity and page"
```
Prefer new commits over `--amend`. Keep generated files (icons from `generate-icons.mjs`) committed only when they are product assets.

## Conflicts
1. `git status` to list conflicted files; read both sides fully before editing.
2. Resolve by intent, not by picking "ours/theirs" wholesale; for `package-lock.json` re-run `npm install` after resolving `package.json`.
3. Re-run lint/typecheck/tests before concluding the merge.
4. If unsure which side is right, stop and ask — never discard someone else's change silently.

## Pull requests (when a GitHub remote exists — use `gh`)
- `git push -u origin <branch>` then `gh pr create --base main --title "<conventional title>" --body-file …`.
- Body: summary, motivation, screenshots for UI (light + dark), test plan with exact commands, risks; end with the attribution line from the system reminder if present.
- Don't `@mention` people/roles unless intended (GitHub notifies them); put placeholders in backticks.
- Review with `milo-code-review` before requesting human review; address findings with new commits.
- Merge strategy: merge commit (`--no-ff`) to keep branch history, matching the local convention, unless the repo settings say otherwise.

## Branch protection / rulesets (verified options)
Recommend for `main`: require PR before merging (≥ 1 approval, dismiss stale approvals), require status checks (CI job from `github-actions-ci`), require conversation resolution, block force pushes and deletions (default), optionally require linear history or merge queue. Rulesets can layer; the most restrictive rule wins. Changing repository settings is outward-facing — confirm with the user first.

## Windows notes
`.gitattributes` forces LF (`* text=auto eol=lf`); `core.autocrlf=false` in this repo. The repo path contains Cyrillic and spaces — always quote it.

## Sources (read 2026-11-04)
https://www.conventionalcommits.org/en/v1.0.0/ · https://git-scm.com/docs/git-push · https://docs.github.com/…/about-protected-branches · https://docs.github.com/…/about-rulesets

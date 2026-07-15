---
name: commit-prep
description: Generate branch name, conventional commit message, and PR description from staged changes. Never commits or pushes. Use when user asks to prep a commit, write a commit message, or prepare a PR.
disable-model-invocation: true
---

# Commit Prep

Generate branch name, commit message, and PR body from staged changes. Never commit or push.

## Prerequisites

Git repo with staged changes (`git diff --cached` non-empty).

## Workflow

1. Run `git diff --cached --stat` and `git diff --cached`.
2. Run `git log --oneline -10` to match repo's commit style.
3. Produce all three outputs.

## Output

### Branch name

Kebab-case: `<type>/<short-description>` (e.g. `fix/bigint-join-precision`, `feat/rate-limiter-config`).

### Commit message

One-line scoped conventional commit: `<type>(<scope>): <description>`

- Types: feat, fix, refactor, docs, test, chore, ci, perf
- Scope: narrowest affected area
- Description: imperative mood, lowercase, no period

### PR body

```text
## Summary

<1-3 bullets: what changed and why>

## Test plan

<how to verify the change>
```

## Rules

- Do not commit, push, or modify any files.
- If nothing staged, say so and stop.
- Match existing commit style when log shows a clear pattern.

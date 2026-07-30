---
name: code-review
description: >-
  Review a single pull request with parallel readonly agents. Parameterized by
  repo, agent roster, and project context. Use when reviewing a pull request,
  checking a PR before merge, or asked for a second opinion on a diff. Scoped
  to one PR's diff — to sweep a whole repo's open items, use project-triage.
---

# Code Review

Parallel PR review. Project-specific context is injected — this skill has no hardcoded repo.

## Parameters

| Param        | Source                                                     | Example                                             |
| ------------ | ---------------------------------------------------------- | --------------------------------------------------- |
| `repo`       | prompt or `git remote`                                     | `owner/name`                                        |
| `pr`         | required                                                   | `123`                                               |
| `agents`     | config or default                                          | `["patterns", "regression-risk", "review-context"]` |
| `context`    | `$WORKSPACE/.reviews/<domain>/<repo>/context.md` or prompt | architecture notes                                  |
| `output_dir` | default `$WORKSPACE/.reviews/<domain>/<repo>/`             |                                                     |

Domain is inferred from workspace layout or prompt.

## Workflow

1. If PR number not provided, ask the user.
2. Fetch PR metadata:

```bash
gh pr checkout <pr_number> --repo <repo>
bash <skill-dir>/scripts/fetch-pr-review.sh <repo> <pr_number>
```

1. If PR not found or empty diff, report and stop.
2. Launch parallel readonly agents (Task tool). Pass PR JSON + project `context.md` to each.
   Default roster if no config:
   - patterns / architecture conventions
   - regression-risk
   - review-context (existing human/bot review threads)
3. Merge agent results into one report (template below).
4. Write to `$WORKSPACE/.reviews/<domain>/<repo>/<timestamp>-pr-<number>.md`
5. `git checkout -` to restore previous branch.
6. Present summary: verdict, risk, blocker count, unresolved threads.

## Report template

````markdown
# Code Review — PR #<number>

[<title>](url)

**Author:** <author> | **Base:** <base> ← <head> | **Files changed:** N | **+additions/-deletions**

**Verdict:** Approve / Request changes / Needs discussion
**Risk:** Low / Medium / High / Critical
**Blockers:** N | **Concerns:** N | **Suggestions:** N

---

## Review Comments

### BLOCKER — <short title>

**File:** `<path>` | **Lines:** L<start>-L<end>

```<lang>
<code snippet>
```

<what's wrong, why it matters, what to do>

### CONCERN — ...

### SUGGESTION — ...

## Call-Path Trace

Only non-obvious risk paths.

## Missing Test Coverage

| Scenario | Given | When | Then |
| -------- | ----- | ---- | ---- |

## Existing Review Context

- Human reviews / bot findings / CI

## Actions

- [ ] <action item>
````

## Constraints

- Agents are readonly
- Reports go under workspace `.reviews/`, never into project source trees
- Project context (brittle areas, architecture layers) lives in `context.md` next to configs — not in this skill

## Done when

Every changed file has been read, each finding cites a concrete file and line, findings are separated into blocking and non-blocking, and no code was modified unless the user asked for fixes.

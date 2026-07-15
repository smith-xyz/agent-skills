---
name: code-review
description: >-
  Review a PR with parallel readonly agents. Parameterized by repo, agent roster,
  and project context. Writes reports to <workspace>/.reviews/<domain>/<repo>/.
  Use when reviewing pull requests.
---

# Code Review

Parallel PR review. Project-specific context is injected — this skill has no hardcoded repo.

## Parameters

| Param | Source | Example |
|-------|--------|---------|
| `repo` | prompt or `git remote` | `owner/name` |
| `pr` | required | `123` |
| `agents` | config or default | `["patterns", "regression-risk", "review-context"]` |
| `context` | `$WORKSPACE/.reviews/<domain>/<repo>/context.md` or prompt | architecture notes |
| `output_dir` | default `$WORKSPACE/.reviews/<domain>/<repo>/` | |

Domain is inferred from workspace layout or prompt.

## Workflow

1. If PR number not provided, ask the user.
2. Fetch PR metadata:

```bash
gh pr checkout <pr_number> --repo <repo>
bash ~/.cursor/skills/code-review/scripts/fetch-pr-review.sh <repo> <pr_number>
```

3. If PR not found or empty diff, report and stop.
4. Launch parallel readonly agents (Task tool). Pass PR JSON + project `context.md` to each.
   Default roster if no config:
   - patterns / architecture conventions
   - regression-risk
   - review-context (existing human/bot review threads)
5. Merge agent results into one report (template below).
6. Write to `$WORKSPACE/.reviews/<domain>/<repo>/<timestamp>-pr-<number>.md`
7. `git checkout -` to restore previous branch.
8. Present summary: verdict, risk, blocker count, unresolved threads.

## Report template

````
# Code Review — PR #<number>

[<title>](<url>)

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
|----------|-------|------|------|

## Existing Review Context

- Human reviews / bot findings / CI

## Actions

- [ ] <action item>
````

## Constraints

- Agents are readonly
- Reports go under workspace `.reviews/`, never into project source trees
- Project context (brittle areas, architecture layers) lives in `context.md` next to configs — not in this skill

## Artifact Emission

emits: code-review

After completing a review, emit the verdict:

```bash
artifact emit --kind code-review --domain <domain> --repo <org/repo> \
  --id "pr-<number>" \
  --title "Review: PR #<number> — <short title>" \
  --status done \
  --source code-review \
  --data '{"pr_number": <N>, "pr_url": "<url>", "verdict": "<approve|approve-with-comments|request-changes|reject>", "risk": "<low|medium|high|critical>", "blockers_count": <N>, "concerns": ["<concern1>", "<concern2>"]}'
```

At session end:

```bash
artifact suggest --source-skill code-review --text "<follow-up action or schema gap>"
```

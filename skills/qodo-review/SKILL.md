---
name: qodo-review
description: Fetch Qodo bot comments from the current branch's PR, categorize them, recommend actions, and implement fixes. Use when the user mentions qodo, qodo comments, PR review comments, or wants to address automated review feedback.
---

# Qodo Review

Fetch and triage Qodo bot review comments from the current branch's PR.

## Prerequisites

- `gh` CLI authenticated
- `jq` installed
- Current branch has an open PR with Qodo comments

## Workflow

### 1. Fetch comments

From this skill directory:

```bash
./scripts/fetch-qodo-comments.sh
```

Returns JSON with `inline_comments`, `summary_comments`, and `stats`. Use `--format text` for human-readable output. Use `--bot PATTERN` if the bot username doesn't contain "qodo".

### 2. Categorize each comment

Classify every Qodo comment into one of:

| Category | Description | Action |
| -------- | ----------- | ------ |
| **bug** | Identifies a real bug or logic error | Fix required |
| **security** | Security vulnerability or risk | Fix required |
| **suggestion** | Code improvement, readability, style | Evaluate — fix if low-effort and valuable |
| **informational** | Explanation, summary, or context | No action needed |
| **false-positive** | Incorrect or irrelevant finding | Dismiss |

### 3. Present recommendations

For each non-informational comment, present:

```text
[CATEGORY] file:line
  Qodo says: <one-line summary of the comment>
  Recommendation: <fix | evaluate | dismiss>
  Reason: <why this recommendation>
```

Group by file. Put bug/security first.

### 4. Ask before fixing

After presenting recommendations, ask the user which comments to address. Do not implement fixes without confirmation.

### 5. Implement fixes

For confirmed items:

1. Read the file at the relevant location
2. Apply the fix
3. Verify no lint errors introduced
4. Summarize what changed

For dismissed items: optionally reply to the Qodo comment on the PR explaining the dismissal (only if user requests).

## Edge cases

- **No PR found**: tell user to push the branch and open a PR first.
- **No Qodo comments**: report "no Qodo comments found" and stop.
- **Qodo summary only (no inline)**: present the summary, note there are no actionable inline comments.
- **Bot username mismatch**: suggest `--bot PATTERN` with a different pattern. Common alternatives: `codium`, `github-actions`.

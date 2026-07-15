---
name: pr-comments
description: >-
  Fetch PR review comments (human + bots), present them to the user, and
  optionally triage/fix. Use when the user asks about PR comments, review
  feedback, Qodo, CodeRabbit, or wants to address automated review findings.
---

# PR Comments

Fetch comments from the current branch's PR and present them. Works for any reviewer — human or bot. Apply bot-specific notes below when Qodo or CodeRabbit are present.

## Prerequisites

- `gh` CLI authenticated
- `jq` installed
- Current branch has an open PR

## Workflow

### 1. Fetch comments

From this skill directory:

```bash
./scripts/fetch-pr-comments.sh
```

Defaults: **all** review + issue comments on the PR.

| Flag | Effect |
|------|--------|
| `--format text` | Human-readable instead of JSON |
| `--bot PATTERN` | Filter to usernames matching PATTERN (case-insensitive) |
| `--bots` | Filter to known review bots (qodo, coderabbit, codium, …) |

Returns JSON with `inline_comments`, `summary_comments`, `by_author`, and `stats`.

### 2. Present to the user

Group by author, then by file. Lead with actionable inline comments; put summary/overview comments after.

For each comment show:

```text
[author] file:line
  <one-line summary>
  url: <html_url>
```

If a known bot is present, apply the **Bot notes** section when summarizing.

### 3. Triage (only if user wants action)

Classify comments the user wants handled:

| Category | Description | Action |
|----------|-------------|--------|
| **bug** | Real bug or logic error | Fix required |
| **security** | Vulnerability or risk | Fix required |
| **suggestion** | Improvement / style | Evaluate — fix if low-effort and valuable |
| **informational** | Explanation or context | No action |
| **false-positive** | Incorrect or irrelevant | Dismiss |

Present recommendations, then **ask before fixing**. Do not implement without confirmation.

### 4. Implement (confirmed items only)

1. Read the file at the relevant location
2. Apply the fix
3. Check for lint errors
4. Summarize what changed

Reply on the PR only if the user asks.

## Bot notes

### Qodo / Codium

- Often posts a **summary** issue-comment plus many **inline** findings
- Inline comments may include severity-ish language; still verify against the code
- False positives are common on style/idiom — don't rubber-stamp
- Username usually matches `qodo` or `codium`

### CodeRabbit

- Posts structured review summaries and inline suggestions
- Often includes "committable" suggestion blocks — treat as proposals, not mandates
- May re-review on new pushes; prefer the latest thread on a line
- Username usually matches `coderabbit`

### Other bots

Use `--bot PATTERN` or `--bots`. Same triage rules; no special parsing unless the user asks.

## Edge cases

- **No PR found**: tell user to push and open a PR first
- **No comments**: report empty and stop
- **Summary only (no inline)**: present summary; note nothing file-scoped to act on
- **Bot username mismatch**: retry with `--bot PATTERN`

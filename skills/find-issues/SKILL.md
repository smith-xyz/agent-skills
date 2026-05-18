---
name: find-issues
description: Find GitHub issues for OSS contribution using gh CLI. Use when user asks to find issues, contribute to open source, or pick up work.
disable-model-invocation: true
---

# Find Issues

Find actionable GitHub issues to contribute to. Requires `gh` CLI authenticated and a git repo with GitHub remote.

## Parameters

| Param | Values | Default |
| ----- | ------ | ------- |
| difficulty | easy, medium, hard, any | medium |

Parse from user: "easy issue" → easy, "I want a challenge" → hard, "find something to work on" → medium.

## Difficulty labels

| Level | Common labels |
| ----- | ------------- |
| easy | "good first issue", "easy", "beginner", "starter" |
| medium | "help wanted", "bug", "needs triage", "enhancement" |
| hard | "complex", "performance", "architecture", "breaking change" |

## Workflow

1. Detect repo: `git remote get-url origin`
2. Query open issues:

```bash
gh issue list --state open --label "<label>" --limit 20 --json number,title,labels,body,comments,linkedBranches,createdAt,author
```

For medium/hard/any, fetch broadly then filter by labels or comment count (5+ for hard).

1. Filter for actionable:
   - Exclude issues with linked branches/PRs (someone is working on it).
   - Prefer clear reproduction steps or descriptions.
   - Check for pending PRs: `gh pr list --state open --search "fixes #<N> OR closes #<N>"`

2. Present 3–5 candidates: issue number, title, labels, brief description, why it's a good candidate, link.

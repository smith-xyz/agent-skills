---
name: work-review
description: Summarize recent work from agent transcripts and optional Jira mapping.
model: fast
readonly: true
---

# Work review

Summarize what shipped from conversation and agent transcript history. Transcripts are the source of truth.

1. Identify time window and scope from the user (default lookback ~7 days if unspecified).
2. Use the `work-review` skill scripts under `skills/work-review/scripts/` when available (list-projects, extract-transcript, optional jira fetch).
3. Output: themes or timeline, accomplishments, in-progress, blockers. Add Jira keys only if the user asked for ticket mapping.

If scripts or paths are unavailable, ask the user to paste transcript excerpts or run commands locally.

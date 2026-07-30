# Orchestrate Formats

## State Log Format

See `references/state-log.md`. Append-only, one line per event:

```text
2026-07-01T14:30:00Z | 1.2 | pass | 3/3 criteria pass | attempts=1
```

## Completion Report Format

See `references/completion-report.md`. All `*-dev` agents produce this format when dispatched with acceptance criteria.

## Quality Gates (Optional)

Beyond acceptance criteria, the verify step can dispatch:

- `verifier` agent — skeptical LLM validation of claimed-complete work
- `sniff-bugs` — defect sweep on modified files

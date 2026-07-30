# Task File Format

Task files live in `backlog/phase-N/X.Y-name.md`. Each file defines a unit of work for the orchestrator.

## Template

```markdown
# X.Y — Title

**Agent:** agent-name
**Depends on:** 1.1, 1.2
**Model hint:** standard | fast | complex

## Goal

One paragraph describing what this task achieves.

## Tasks

1. First implementation step
2. Second step
3. ...

## Acceptance Criteria

- `go test ./... -count=1` exits 0
- `curl -s http://localhost:8080/api/health` returns `{"status":"ok"}`
- SELECT COUNT(*) FROM findings > 0

## Status

**pending** — not started
```

## Fields

| Field | Required | Purpose |
| ------- | ---------- | --------- |
| `Agent:` | Yes | Which subagent to dispatch (e.g. `go-dev`, `typescript-dev`) |
| `Depends on:` | No | Prerequisite task IDs (comma-separated) |
| `Model hint:` | No | Complexity hint for model routing (`fast`, `standard`, `complex`) |
| `Tasks` | Yes | Numbered implementation steps |
| `Acceptance criteria` | Yes | Concrete pass/fail checks. Backtick-wrapped commands are auto-executable |
| `Status` | Auto | Updated by orchestrator after verification |

## Status Values

- **pending** — not started
- **in_progress** — dispatched to agent
- **pass** — all acceptance criteria verified by runtime execution
- **partial** — some criteria pass, list exactly which failed
- **fail** — max retries exhausted
- **blocked** — external dependency prevents progress

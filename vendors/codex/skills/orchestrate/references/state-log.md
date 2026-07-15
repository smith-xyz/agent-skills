# State Log Format

Append-only log tracking task execution history. One line per event.

## Format

```
{ISO-timestamp} | {task_id} | {status} | {summary} | attempts={N}
```

## Examples

```
2026-07-01T14:30:00Z | 1.2 | pass | 3/3 criteria pass | attempts=1
2026-07-01T15:10:00Z | 1.3 | partial | 2/4 criteria pass, AC-3 fail: "go test exit 1" | attempts=2
2026-07-01T15:45:00Z | 1.1 | blocked | 0/3 criteria pass, blocker: PG not reachable | attempts=3
2026-07-01T16:00:00Z | 1.4 | in_progress | dispatched to typescript-dev | attempts=0
```

## Status Definitions

| Status | Meaning | Orchestrator action |
|--------|---------|-------------------|
| `pass` | All criteria verified by runtime execution | Move to next task |
| `partial` | Some criteria pass, some fail | Resume agent with failures |
| `fail` | Max retries exhausted | Escalate to user |
| `blocked` | External dependency prevents progress | Document blocker, move on |
| `in_progress` | Dispatched, awaiting completion | Wait for report |

## Rules

- Only the orchestrator writes to the state log
- Never overwrite or rewrite — append only
- Dev agents report via completion reports, never touch the log
- The log is the source of truth for task status across sessions

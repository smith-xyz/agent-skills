# Completion Report Format

All `*-dev` agents produce this format when dispatched by the orchestrator with acceptance criteria.

## Format

```yaml
status: pass | partial | fail | blocked
criteria:
  - id: "AC-1"
    result: pass | fail
    verified_by: "exact command and output proving the result"
    detail: "one-line explanation"
    error: "exact error output if fail"
blocker: "what prevents progress, if any"
```

## Rules

- **`pass`** means you ran the check and it succeeded — not "the code looks correct"
- **`verified_by`** must reference an actual command execution and its output
- If you couldn't run a check, mark the criterion `fail` with `verified_by: "not executed — [reason]"`
- Never conflate "I wrote the code" with "it works"
- The orchestrator validates every `verified_by` field and rejects reports with non-runtime checks

## On Retry

1. Read the exact error from the orchestrator's feedback
2. Reproduce by running the failing check
3. Make the minimum fix
4. Re-run ALL acceptance criteria (fixes cause regressions)
5. Report using this format

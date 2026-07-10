---
name: go-dev
description: Implement or refactor Go code using go-patterns (services, CLIs, tests, containers).
model_tier: fast
readonly: false
---

# Go development

1. Read and follow the `go-patterns` skill (package layout, errors, concurrency, tests, container and security conventions when building services).
2. Clarify scope, then implement: types and interfaces before concrete code; table-driven tests; no hardcoded values.
3. For services: multi-stage Dockerfile, static binary, non-root runtime, `gosec` and `govulncheck` in the check path when applicable.

If the skill path is unavailable in context, apply the same conventions from the installed `go-patterns` skill under `skills/go-patterns/`.

## Completion Report (when dispatched by orchestrator)

When dispatched with acceptance criteria, end with a structured YAML report:

```yaml
status: pass | partial | fail | blocked
criteria:
  - id: "AC-1"
    result: pass | fail
    verified_by: "exact command and output"
    error: "exact error if fail"
blocker: "what prevents progress, if any"
```

`verified_by` must reference an actual command execution — not "code looks correct".

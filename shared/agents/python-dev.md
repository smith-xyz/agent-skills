---
name: python-dev
description: Implement or refactor Python using python-patterns (types, pydantic, services).
model_tier: fast
readonly: false
---

# Python development

1. Read and follow the `python-patterns` skill (type hints, pydantic for external data, dataclasses for internal, concise style, error context).
2. Clarify responsibilities and data boundaries, then implement using the package layout in the skill when structuring apps.
3. Prefer single-responsibility classes and meaningful logging only where it adds signal.

If the skill path is unavailable in context, apply conventions from `skills/python-patterns/`.

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

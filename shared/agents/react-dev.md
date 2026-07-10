---
name: react-dev
description: Build React and TypeScript UI using react-patterns and typescript-patterns.
model_tier: fast
readonly: false
---

# React development

1. Read and follow `typescript-patterns` then `react-patterns` (types first, hooks for logic, components for UI, no `any` without approval).
2. Clarify data flow and state, then build bottom-up: types, hooks, components, integration.
3. Match the feature layout under `src/` (components, hooks, providers, types) from the skill.

If skills are unavailable in context, use the installed skills under `skills/typescript-patterns/` and `skills/react-patterns/`.

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

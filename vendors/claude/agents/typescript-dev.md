---
name: typescript-dev
description: TypeScript for backends, CLIs, and libraries using typescript-patterns. Use react-patterns for React UI.
model: haiku
---

# TypeScript development

1. Read `typescript-patterns` SKILL.md; use `references/*.ts` for examples. Name classes by role or adapter (`UserService`, `PostgresUserRepository`); name interfaces by port (`UserRepository`).
2. For React UI, use `react-dev` or `react-patterns`.
3. Clarify interfaces and error strategy; follow layout rules in the skill.

If the skill path is unavailable in context, use `skills/typescript-patterns/`.

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

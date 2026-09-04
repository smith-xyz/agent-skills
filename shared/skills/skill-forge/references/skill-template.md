# Skill Template

Copy this into `<catalog>/<name>/SKILL.md` and fill it in. Every section maps
to a rubric criterion — do not drop sections.

```markdown
---
name: <verb-noun>
description: >-
  <What it does, one clause>. Use when <trigger>, <trigger>, or <trigger>.
---

# <Title Case Name>

<One or two sentences: what this produces and why it exists. If there is a
non-obvious constraint or a failure mode worth naming, name it here.>

## Parameters            # omit if the skill takes none

| Param | Default | Meaning |
|-------|---------|---------|
| `input` | required | <what it is> |
| `output` | `~/agent-workspace/<domain>/<repo>/<area>/<slug>.md` | <where results land> |

If `~/agent-workspace/<domain>/<repo>/profiles/<name>.md` exists, read it
first for repo-specific defaults.

## Procedure             # R2 + R3

1. <First step. Start explicit — what to read or resolve before acting.>
2. <Next step.>
3. <Keep steps small enough to check off. Prefer a command over a paragraph.>
4. <Last step: report, then stop.>

## Constraints           # the guardrails

- <What this skill must never do.>
- <Budgets: line counts, round ceilings, file limits.>
- <Anything read-only.>

## Done when             # R5 — required, never omit

<The observable end state. A file exists at a path, a command exits zero, a
table has a row per input. Written so someone else could check it.>
```

## Notes

- **Budget: 120 lines.** Move templates, worked examples, and deep technique
  into sibling files under `references/` and link them.
- **No absolute paths, no vendor directories** in the body — that is an R6
  failure and makes the skill non-portable across machines and tools.
- **Write `## Done when` first.** It forces the routine to have an end, which
  is the difference between a skill and a prompt.
- **Commands over prose** wherever a command exists. Prose drifts between runs;
  commands do not.

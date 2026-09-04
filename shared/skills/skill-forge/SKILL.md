---
name: skill-forge
description: >-
  Scaffold a new skill or subagent to the R1-R7 rubric when no existing skill
  covers the work. Use when asked to create or add a skill, when reflect
  proposes a new skill, or when a repeated manual routine should become a skill.
---

# Skill Forge

Scaffold a skill in one pass when a repeatable routine has no catalog match.
Do not forge one-offs — that is how catalogs rot.

## When to forge vs. when not to

| Situation | Action |
| ----------- | -------- |
| Work is a repeatable routine with no match | **Forge** |
| Nearest match is close but too narrow | **Widen the existing skill** |
| Work is genuinely one-off | Don't forge — just do the work |
| Routine is repo-specific, global skill exists | Write `~/agent-workspace/<domain>/<repo>/profiles/<skill>.md` |
| `reflect` proposed a draft | Review the draft; forge or amend from it |

## Procedure

1. **Check for an overlap first.**

   ```bash
   reflect catalog | grep -i '<keyword>'
   ```

   Widening beats adding a sibling — R7 conflicts are expensive.

2. **Name it** as `<verb>-<noun>` or `<noun>-<verb>`: `code-review`,
   `notes-synthesize`, `ghsa-triage`.

3. **Write the description before the body** — it must answer *when*:

   ```yaml
   description: >-
     <What it does in one clause>. Use when <trigger phrase>, <trigger
     phrase>, or <trigger phrase>.
   ```

4. **Scaffold to the rubric** using
   [references/skill-template.md](references/skill-template.md).

5. **Write the stop condition first, steps second.** `## Done when` makes it
   repeatable.

6. **Keep `SKILL.md` at or under 120 lines.** Detail goes in `references/`.

7. **Verify** before reporting:

   ```bash
   reflect catalog | grep '<name>'
   ```

   Then self-check R1–R7 as `skill-audit` would.

8. **Report** the path and trigger phrases, then stop.

## Rubric reminders

| # | Criterion | What it means here |
| --- | ----------- | -------------------- |
| R1 | Triggerable | `description` says when, in the user's words |
| R2 | A routine | Numbered steps, explicit start and stop |
| R3 | Repeatable | Same input, same output shape |
| R4 | Focused | One job, 120 lines max |
| R5 | Verifiable | Has a `## Done when` |
| R6 | Portable | No absolute or vendor paths |
| R7 | Distinct | No sibling claims the same trigger |

## Subagents instead of skills

Forge a **subagent** when the work needs its own context window. Subagents live
in `agents/`. Everything else is a skill.

## Done when

The new `SKILL.md` exists, is discoverable via `reflect catalog`, passes a
self-check against all seven criteria, and its description does not collide
with an existing skill's trigger.

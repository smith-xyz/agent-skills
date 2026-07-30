---
name: skill-forge
description: >-
  Scaffold a new skill or subagent to the R1-R7 rubric when no existing skill
  covers the work. Use when the route gate finds no match, when asked to create
  or add a skill, or when a repeated manual routine should become a skill.
---

# Skill Forge

The route gate is a hard stop: no matching skill means no writes. This skill is
the way out of that stop, so it must be fast — a scaffolded skill in one pass,
not a design exercise.

## When to forge vs. when not to

| Situation | Action |
| ----------- | -------- |
| Route gate found no match, work is a repeatable routine | **Forge** |
| Nearest match is close but too narrow | **Widen the existing skill** instead |
| Work is genuinely one-off | Don't forge — use `agent-gate override` |
| Routine is repo-specific, global skill exists | Write `.agent/profiles/<skill>.md` |

Forging a skill for one-off work is how catalogs rot. The test is: *will I do
this again?* If no, override and move on.

## Procedure

1. **Check for an overlap first.**

   ```bash
   agent-gate catalog | grep -i '<keyword>'
   ```

   If anything comes close, widening it beats adding a sibling — R7 conflicts
   are more expensive than a slightly broader skill.

2. **Name it** as `<verb>-<noun>` or `<noun>-<verb>`: `code-review`,
   `notes-synthesize`, `ghsa-triage`. The name is a routing key; make it the
   words you would actually type.

3. **Write the description before the body.** It carries the entire routing
   decision and must answer *when do I invoke this*:

   ```yaml
   description: >-
     <What it does in one clause>. Use when <trigger phrase>, <trigger
     phrase>, or <trigger phrase>.
   ```

   Trigger phrases are the user's words, not internal jargon.

4. **Scaffold to the rubric** using
   [references/skill-template.md](references/skill-template.md). Every section
   in that template maps to a rubric criterion — none are optional.

5. **Write the stop condition first, steps second.** A routine without an
   explicit end is a prompt, and prompts drift. The `## Done when` section is
   the part that makes a skill repeatable.

6. **Keep `SKILL.md` at or under 120 lines.** Anything longer — templates,
   worked examples, deep technique — goes in `references/`.

7. **Verify** before reporting:

   ```bash
   agent-gate catalog | grep '<name>'   # discoverable
   ```

   Then self-check R1–R7 as `skill-audit` would.

8. **Report** the path and the trigger phrases, then stop. Forging a skill is
   not permission to run it — the user routes into it deliberately.

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

Forge a **subagent** when the work needs its own context window — long
research, wide codebase sweeps, anything that would flood the main
conversation. Subagents live in `agents/` and take a role prompt rather than a
routine. Everything else is a skill.

## Done when

The new `SKILL.md` exists, is discoverable via `agent-gate catalog`, passes a
self-check against all seven criteria, and its description does not collide
with an existing skill's trigger.

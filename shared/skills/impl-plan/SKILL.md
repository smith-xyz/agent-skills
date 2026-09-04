---
name: impl-plan
description: >-
  Produce a scoped, ordered implementation plan from a work item, ticket key, or
  free-text description. Gathers context from linked research, the tracker, and
  the codebase, then writes a markdown plan that assigns each step to you or to
  an agent. Plan only — never executes. Use when planning an implementation,
  breaking down a ticket, or before dispatching dev agents.
---

# Implementation Plan

Turn a work item into an ordered, agent-scoped plan. **The plan is the
deliverable.** Execution is a separate step.

## Parameters

| Param | Default | Meaning |
| ------- | --------- | --------- |
| `input` | required | Ticket key, or free-text work description |
| `output` | `~/agent-workspace/<domain>/<repo>/plans/<slug>.md` | Plan path under home |

Derive `slug` from the ticket key, lowercased, or from a kebab-cased title.
If `~/agent-workspace/<domain>/<repo>/profiles/impl-plan.md` exists, read it
first — it carries the repo's tracker project, gates, and preferred agents.

## Procedure

### 1. Check for an existing plan

Glob `~/agent-workspace/<domain>/<repo>/plans/` for the slug. If a current
plan exists, report it and
stop. Re-plan only on an explicit refresh request or a material change to the
source item.

### 2. Gather context

- **Ticket** — fetch description, acceptance criteria, comments, and labels.
- **Prior research** — read any `~/agent-workspace/<domain>/<repo>/research/`
  memo covering this work.
  Acceptance criteria from the ticket outrank a memo's inferred scope.
- **Codebase recon** — grep and glob for the files in scope, then read enough
  surrounding code to name concrete touch points. Vague areas are a planning
  failure; name files.
- **Gates** — note any review, embargo, or approval gate the work must clear.

### 3. Decide who writes each step

Every step is assigned `hand` or `agent`. This is the point of the plan, not a
formality.

| Signal | Assign |
| -------- | -------- |
| Core logic in a language you're sharpening | `hand` |
| Small, high-judgement change (under ~40 lines) | `hand` |
| Anything you'd want to be able to defend in review | `hand` |
| Boilerplate, config, codegen, mechanical refactor | `agent` |
| Large mechanical change across many files | `agent` |
| Test scaffolding around logic you wrote | `agent` |

A plan where every step is `agent` is wrong. Push back on yourself.

For `agent` steps, pick the agent from
[references/agents.md](references/agents.md).

### 4. Size the steps

- One logical change per step — one PR-sized unit.
- Order by dependency; mark independent steps parallelizable.
- Include a verification step where it earns its place.
- Describe what to do, never how the agent should phrase it.

### 5. Write the plan

**Budget: 80 lines.** Scope, steps, and acceptance criteria only. No essays,
no context dumps. If the plan needs a system design explanation, produce a
diagram with `excalidraw-diagram` and link it.

Use the template in [references/plan-template.md](references/plan-template.md).

### 6. Report

Give the plan path, step count, the hand/agent split, complexity with a one-line
rationale, and any risk worth attention. Then stop. **Do not execute.**

## Complexity heuristics

| Signal | Complexity |
| -------- | ------------ |
| 1 repo, 3 files or fewer, no migrations | low |
| 2+ repos, schema or API change, cross-service | medium |
| New subsystem, multi-language, gated, unclear deps | high |

## Constraints

- **Plan only.** Never implement, commit, or deploy from this skill.
- **No duplicate plans.** Always check first.
- **Concrete paths** over vague areas.
- **Never modify source material.** Memos, specs, and tickets are read-only.

## Done when

The plan file exists within the 80-line budget, every step names real files and
carries a `hand` or `agent` assignment, acceptance criteria are checkable
commands or behaviors, and nothing has been implemented.

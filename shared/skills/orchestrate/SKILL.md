---
name: orchestrate
description: >-
  Execute against a project backlog with feedback loops. Reads task files,
  resolves dependencies, dispatches specialist agents, verifies acceptance
  criteria, and loops until done. Use when user says orchestrate, run task,
  run phase, sprint, or execute backlog.
disable-model-invocation: true
---

# Orchestrate

Generic project loop. Survey → Target → Dispatch → Verify → Loop/Escalate.

**Skill Dependencies:** `verifier` agent (acceptance criteria), `researcher` agent (optional), `sniff-bugs` (optional quality gate)

## Quick Start

| Command              | What happens                                                        |
| -------------------- | ------------------------------------------------------------------- |
| "run task 1.2"       | Read task file, dispatch agent, verify criteria                     |
| "run phase 1"        | Read all phase-1 tasks, build DAG, dispatch parallel where possible |
| "run phase 1 then 2" | Sequential phases                                                   |

## Prerequisites

- Backlog directory with task files (see `references/task-format.md`)
- State log location: project-local `backlog/.state.log` or `~/.agent-skills/state/orchestrate/{project}/`

## Scripts

| Script                                                      | Purpose                                              |
| ----------------------------------------------------------- | ---------------------------------------------------- |
| `./scripts/validate-task.sh <task-file>`                    | Parse acceptance criteria, run executable checks     |
| `./scripts/state.sh read <log>`                             | Read state log, show task statuses                   |
| `./scripts/state.sh append <log> <task> <status> <summary>` | Append entry to state log                            |
| `./scripts/check-deps.sh <backlog-dir>`                     | Parse `Depends on:` fields, output DAG + ready tasks |

## The Loop

```text
┌─ Survey ─────────────────────────────────────────────┐
│ Read backlog dir, parse task files, check state log  │
└──────────────────────────────────────────────────────┘
  ↓
┌─ Target ─────────────────────────────────────────────┐
│ Build DAG from Depends on: fields                    │
│ Select tasks with no unmet deps                      │
└──────────────────────────────────────────────────────┘
  ↓
┌─ Dispatch ───────────────────────────────────────────┐
│ Read Agent: field from task file                     │
│ Send task + acceptance criteria to specialist agent  │
│ Include: task content, infra state, constraints      │
└──────────────────────────────────────────────────────┘
  ↓
┌─ Verify ─────────────────────────────────────────────┐
│ Parse structured completion report from agent        │
│ Validate verified_by fields (honesty gate)           │
│ Run validate-task.sh for executable criteria         │
│ Optional: dispatch verifier agent or sniff-bugs      │
└──────────────────────────────────────────────────────┘
  ↓
  pass → append state log → next task
  fail → resume agent with error (max 3 attempts)
  still failing → escalate to user
```

## Task Sources

**Markdown backlog (default):** Task files in `backlog/phase-N/X.Y-name.md` — see `references/task-format.md`.

**GitHub Projects (alternative):** Use GitHub MCP `projects` tools to fetch project items, then map to task format. The orchestrator reads whatever task source the project provides.

## Iteration Bounds

- Max 3 fix attempts per task before escalating to user
- Max 3 consecutive iterations with no improvement → stop and report
- After each iteration, log delta:

  ```text
  Iteration [N]: [task] — [status]
    Before: [state] | After: [state]
    Files: [list]
  ```

## Honesty Validation

Agent completion reports must include `verified_by` per criterion. Reject reports where:

- `verified_by` says "code looks correct" or "should work"
- `verified_by` references a static read instead of runtime execution
- A criterion is marked `pass` without an actual command/output

Send agent back: "AC-X: verified_by is not a runtime check. Run [the command] and report real output."

## Verify-First Protocol

On startup, even tasks with `pass` in the state log get re-verified. This catches regressions from later work. If re-verification fails, mark `partial` and dispatch for fix.

## Formats and optional gates

State log, completion report, and optional quality-gate formats are in
[references/formats.md](references/formats.md).

## Done when

Every dispatched task either passed its acceptance criteria or is reported as blocked with the specific failure. The loop stopped on a real terminal condition — never on running out of tasks to guess at.

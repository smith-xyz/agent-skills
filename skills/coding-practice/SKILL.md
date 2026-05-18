---
name: coding-practice
description: Generate coding practice sessions (no-AID). Use when user asks for coding task, practice problem, or coding exercise.
disable-model-invocation: true
---

# Coding practice

Generate a coding practice session. Do not implement the solution.

## Parameters

- Difficulty (required): `easy` | `intermediate` | `hard` | `real`
- Language (optional, ask if missing): `rust` | `go` | `typescript` | `python`. For `real`, language can be implied.

## Session setup

Sessions live under `~/.coding-practice/<language>/`. Create directories if needed.

- `easy`/`intermediate`/`hard`: single file `<YYYY-MM-DDTHHMMSS>-<difficulty>.<ext>`. Folder with starter files only if the task genuinely needs multiple files.
- `real`: always a folder `<YYYY-MM-DDTHHMMSS>-real/` with a short spec/README. Concrete product/systems ask (API, operator, CLI tool, etc.).

## Difficulty

- easy: one function or small program.
- intermediate: a few functions, maybe one extra module.
- hard: non-trivial algorithm or design, 2–3 files if needed.
- real: real-world ticket-style task. Scenario, deliverables, constraints. Can span multiple sessions.

## Output

1. Print the task spec in chat (requirements, behavior, constraints).
2. Tell user the session path and to implement without AID.

## When user works in a session file/folder

Give hints or clarify the spec only. Do not implement unless asked.

## When user loads/pastes their solution

Review briefly. Do not rewrite unless asked.

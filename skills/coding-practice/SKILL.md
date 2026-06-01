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

## Script

```bash
./scripts/practice.sh session_paths --language go --difficulty easy
```

Returns JSON with `main`, `test`, and `workdir`/`readme` paths. **User creates the files** at those paths. Agent only prints the task spec in chat.

Naming: `<YYYY-MM-DDTHHMMSS>-<difficulty>.<ext>`; test is `-test` (or `_test` for Go). `real` → folder `<timestamp>-real/` with `README.md` for the spec.

`--multi` for a folder when easy/intermediate/hard needs multiple files.

## Difficulty

- easy: one function or small program.
- intermediate: a few functions, maybe one extra module (`--multi`).
- hard: non-trivial algorithm or design (`--multi` if 2–3 files).
- real: ticket-style task; spec in `README.md`.

## Output

1. Run `session_paths`; give user the paths.
2. Print task spec in chat.
3. User implements without AID.

## When user works in a session

Hints or spec clarification only. Do not implement unless asked.

## When user pastes a solution

Review briefly. Do not rewrite unless asked.

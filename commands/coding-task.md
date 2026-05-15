# Coding task (no-AID practice)

Generate a coding practice session. Do not implement the solution.

## Parameters

- **Difficulty** (required): `easy` | `intermediate` | `hard` | `real`
- **Language** (optional, ask if missing): `rust` | `go` | `typescript` | `python`. For `real`, language can be implied.

## Session setup

Create artifacts under `~/.coding-practice/<language>/`. Create directories if needed.

- `easy`/`intermediate`/`hard`: single file `<YYYY-MM-DDTHHMMSS>-<difficulty>.<ext>`. Use a folder with starter files only if the task genuinely needs multiple files.
- `real`: always a folder `<YYYY-MM-DDTHHMMSS>-real/` with a short spec/README. Not a puzzle — a concrete product/systems ask (API, operator, CLI tool, etc.).

## Difficulty

- **Easy**: one function or small program.
- **Intermediate**: a few functions, maybe one extra module.
- **Hard**: non-trivial algorithm or design, 2–3 files if needed.
- **Real**: real-world ticket-style task. Describe scenario, deliverables, constraints. Can span multiple sessions.

## Output

1. Print the task spec in chat (requirements, behavior, constraints).
2. Tell the user the session path and to implement without AID.
3. When they share their solution, review briefly. Don't rewrite unless asked.

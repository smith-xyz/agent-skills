---
name: sniff-bugs
description: >-
  Hunt latent defects in existing code: logic gaps, error-handling holes,
  resource leaks, concurrency smells, and observability misses. Use when asked
  to sniff bugs, find defects, audit for leaks, or examine error paths. Targets
  a code path or module, not a diff — for a pull request, use code-review.
disable-model-invocation: true
---

# Sniff Bugs

Systematic defect pass on code the user points at (file, diff, PR, or package). Complements `multi-review` (architecture/security perspectives) and `reproduce-issue` (one reported bug).

## Parameters

| Param | Values | Default |
| ----- | ------ | ------- |
| depth | quick, thorough | thorough |
| language | go, rust, typescript, python, any | infer from repo |
| project | optional checklist name | none |

Parse: "quick sniff" → quick. "deep dive" / "thorough" → thorough.
If a project is named (or inferred from cwd), also load a project checklist when present.

## Project checklists

After the base pass, load an optional project-specific checklist:

1. `~/agent-workspace/<domain>/<repo>/profiles/sniff-bugs.md` (preferred)
2. `references/projects/<project>.md` under this skill (fallback)

Project checklists add domain failure modes (contracts, worktree leaks, schema drift). They do not replace the base categories.

## Workflow

1. **Scope** — List files and entry points (handlers, main, public API).
2. **Pass** — Walk every category in [references/checklist.md](references/checklist.md); use [references/signals.md](references/signals.md) for search hints.
3. **Project** — If a project checklist exists, walk those items too.
4. **Trace** — Follow error returns, `defer`/`finally`, context cancellation, and goroutine/task spawn to completion.
5. **Report** — Findings table (see Output). Rank by severity. Cite `path:line` and the failure mode.

**quick:** categories 1–4 only. **thorough:** all categories plus language notes in [references/runtime.md](references/runtime.md) plus project checklist.

## Audit categories

| # | Category | Hunt for |
| - | -------- | -------- |
| 1 | Logic & control flow | Missing branches, wrong comparisons, off-by-one, unreachable paths, stale flags |
| 2 | Error handling | Unhandled errors, empty handlers, lost context, continue after failure, wrong HTTP/status mapping |
| 3 | Resources & lifetime | Unclosed handles, missing `defer`/`using`, leaked goroutines, forgotten `cancel()`, finalizer reliance |
| 4 | State & variables | Shadowing, use-before-init, captured loop vars, unsynchronized shared mutable state |
| 5 | Concurrency | Races, deadlocks, unbounded channels, lock held across I/O |
| 6 | Memory & GC (compiled) | Hot-loop allocation, large retained graphs, slice/map retention, pool misuse |
| 7 | Observability | Thin error logs, missing correlation IDs, stray debug output, mismatched log levels |

## Output

| Severity | File:line | Category | Finding | Suggested fix |
| -------- | --------- | -------- | ------- | ------------- |
| critical / high / medium / low | | | What breaks and when | One concrete change |

End with a short **coverage note**: which categories were checked and what was out of scope.

## Rules

- Read the code path; cite evidence from the implementation.
- Separate confirmed defects from hypotheses (mark hypotheses as `likely`).
- Fix findings when the user asks; default is report-only.
- Apply language pattern skills (`go-patterns`, `rust-patterns`, `typescript-patterns`, `python-patterns`) for idiomatic fixes.

## Done when

Every finding names a file and line, cites evidence from the implementation, and is marked as either a confirmed defect or a hypothesis. The coverage note states what was checked and what was out of scope. No code was changed unless fixes were requested.

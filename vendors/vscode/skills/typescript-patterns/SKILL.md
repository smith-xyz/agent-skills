---
name: typescript-patterns
description: TypeScript patterns - strict types, generics, DI, async patterns, concurrency. Use when writing TypeScript.
---

# TypeScript Patterns

Backend, CLI, library code. For React UI, use `react-patterns`.

## Workflow

1. **Clarify** — I/O, deps, errors
2. **Plan** — types, classes vs functions, config
3. **Build** — define interfaces first, inject deps

## Layout

| Scope | Location |
| ----- | -------- |
| 1:1 interface + class | Same file, interface above class |
| Shared in feature folder | `types.ts` beside modules |
| Package-wide | `src/types/` or `types/` |

Expand `types.ts` into `types/` as shared types grow. Re-export each package's public API from its `index.ts`.

→ [references/layout.ts](references/layout.ts)

## Type safety

- Default to generics, interfaces, or discriminated unions; use `any` after the user confirms
- Narrow `unknown` with a type guard
- Prefer generics over loose unions
- Brand IDs with a readonly brand field

→ [references/type-safety.ts](references/type-safety.ts)

## Classes

Use classes for stateful services and domain objects with invariants. Use functions plus `interface` for stateless logic.

### Naming (interfaces + classes)

Name the interface for the contract (port/role). Name the class for the role or adapter.

| Pattern | Example |
| ------- | ------- |
| Port + adapter | `interface UserRepository` · `class PostgresUserRepository` |
| Service + injected port | `class UserService` · constructor takes `UserRepository` |
| Alternate adapters | `InMemoryUserRepository`, `FakeUserRepository` |
| Port naming | `Clock`, `UserRepository` — capability names |

- Name a single implementation by adapter (`PostgresUserRepository`); introduce the interface when wiring DI or test doubles
- Name services for orchestration (`UserService`); name repository interfaces for persistence (`UserRepository`)
- Match the file name to the primary export (`user-service.ts` → `UserService`)

→ [references/naming.ts](references/naming.ts) · [references/layout.ts](references/layout.ts)

| Topic | Rule |
| ----- | ---- |
| Constructor | Declare deps with `private readonly` parameter properties |
| Privacy | Store internal state in `#field`; mark subclass hooks `protected` |
| Getters/setters | Add getters for derived fields; add setters when assignment validates or syncs state |
| Structure | Add `implements` on services; use `static` for factories; keep one responsibility per class |
| Types | Place 1:1 interfaces above the class; import shared types from `./types.ts` or `types/` |

→ [references/classes.ts](references/classes.ts)

## Control flow & iterators

Write flat functions: guard clauses first, early `return` or `continue`, then separate `if` branches that each return.

| Topic | Rule |
| ----- | ---- |
| Conditionals | Return or continue on edge cases; keep one level of `if` nesting; extract a helper for deeper branches |
| Branching | Chain `if` + `return`; use `switch` with a `never` exhaustiveness check on discriminated unions |
| Loops | Use `for...of`; skip with `continue`; use a counted `for` loop when the index is part of the algorithm |
| Sequences | Use `function*` or `async function*` for lazy or paginated data; use `map` and `filter` for transforms |
| Async loops | Use `for...of` with `await`, `break`, and `continue` in the loop body |

→ [references/control-flow.ts](references/control-flow.ts) · pagination: [references/async.ts](references/async.ts) (`paginate`)

## Architecture

- Load config from env or injected config objects
- Assign one responsibility per module
- Type dependencies as interfaces; register concrete classes at the composition root
- Publish cross-cutting events through TypedEventEmitter

## Async

| Need | Pattern |
| ---- | ------- |
| Parallel | `Promise.all` |
| Partial failure | `Promise.allSettled` |
| Timeout / race | `Promise.race` |
| Stream / pages | `async function*` |
| Cancel | `AbortController` |
| Limit concurrency | Semaphore, `mapWithLimit` |
| Shared mutable state | Mutex |
| Retry | `retry` with backoff |

→ [references/async.ts](references/async.ts) · [references/concurrency.ts](references/concurrency.ts) · [references/result.ts](references/result.ts) · [references/typed-emitter.ts](references/typed-emitter.ts)

## Checklist

- Place types in the same file, `types.ts`, or `types/` by scope
- Name classes by role or adapter; name interfaces by port
- Implement `implements`, store state in `#`, add getters/setters when they derive or validate
- Structure control flow with guard clauses, early return, and `for...of`
- Guard `unknown`, inject deps, externalize config
- Pick the matching Promise helper, cancellation, concurrency tool, and `Result` or boundary try/catch

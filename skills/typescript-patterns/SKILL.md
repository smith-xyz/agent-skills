---
name: typescript-patterns
description: TypeScript patterns - strict types, generics, DI, async patterns, concurrency. Use when writing TypeScript.
---

# TypeScript Patterns

For backend, CLI, or library code (not React UI; use `react-patterns` for React).

## Feature development workflow

1. **Clarify** - Input/output? Dependencies? Error handling?
2. **Plan** - Interfaces, classes or functions, error types, config
3. **Build with DI** - Interfaces first, inject dependencies

## Layout

```text
src/
├── types/        # Interfaces
├── services/     # Business logic
├── utils/        # Pure utilities
├── errors/       # Custom errors
└── index.ts      # Exports
```

## Type Safety

- **No `any`** - Ask user first. Offer: generic, interface, or discriminated union
- **`unknown` requires type guard** - `function isX(v: unknown): v is X`
- **Generics over loose types** - `function first<T>(items: T[]): T | undefined`
- **Branded types for IDs** - `type UserId = string & { readonly __brand: 'UserId' }`

## Architecture

- **No hardcoding** - Use config, environment, or injection
- **Single responsibility** - One purpose per function/class
- **Dependency injection** - Inject interfaces, not implementations
- **Event-driven decoupling** - TypedEventEmitter for cross-cutting concerns

## Async Patterns

| Need | Pattern |
| ------ | --------- |
| Multiple independent fetches | `Promise.all([...])` |
| Partial failure handling | `Promise.allSettled([...])` |
| First response wins / timeout | `Promise.race([...])` |
| Streaming / pagination | `async function* generator()` |
| Cancelable operations | `AbortController` + `signal` |
| Concurrency limiting | Semaphore or `mapWithLimit` |
| Shared state protection | Mutex |
| Retry with backoff | `retry(fn, { attempts, delay, backoff })` |

See reference files for implementations.

## References

- [references/async.ts](references/async.ts) - withTimeout, retry, paginate, collect, deferred, debounceAsync
- [references/concurrency.ts](references/concurrency.ts) - Mutex, Semaphore, mapWithLimit
- [references/result.ts](references/result.ts) - Result type with ok, err, unwrap, tryCatch
- [references/typed-emitter.ts](references/typed-emitter.ts) - TypedEventEmitter

## Checklist

- Interfaces defined before implementations?
- Dependencies injected, not hard-imported concretely?
- `any`? → Generic or interface
- `unknown`? → Type guard
- Hardcoded value? → Config or inject
- Multiple responsibilities? → Split
- Hard import? → Inject interface
- Decoupling needed? → EventEmitter
- Streaming/pagination? → AsyncGenerator
- Cancelable? → AbortController
- Multiple fetches? → Promise.all or allSettled
- Need fallback/timeout? → Promise.race
- Shared state? → Mutex
- Too many parallel ops? → Semaphore
- Error handling with Result or disciplined try/catch?

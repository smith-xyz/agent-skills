# Runtime notes by language

## Go

- Check every `err != nil` branch; wrap with `%w`
- Run `go vet`, `staticcheck`, `govulncheck` when available
- Trace `defer` order; cancel contexts; wait on `errgroup` and `WaitGroup`
- Watch send on closed channels, nil map writes, and interface nil (`typed nil`)

## Rust

- Prefer `?` and `Result`; reserve `unwrap` for tests and proven invariants
- Review `unsafe` blocks and `Send`/`Sync` on shared state
- Confirm `Drop` order; break `Rc` cycles with `Weak` where graphs outlive owners
- Use `clippy` warnings as additional sniff input

## TypeScript / JavaScript

- Enable strict mode; trace `Promise` chains for missing `catch`
- Clear timers and abort in-flight `fetch` on unmount or shutdown
- Type narrow after `await`; handle rejection at API boundaries
- Audit `any` and unchecked JSON parsing at trust boundaries

## Python

- Chain exceptions with `raise ... from e`
- Close files and connections with context managers
- Audit `asyncio` task groups and cancellation on shutdown
- Watch mutable default arguments and shared class-level lists

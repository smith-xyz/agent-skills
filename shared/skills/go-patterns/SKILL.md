---
name: go-patterns
description: Go patterns and idioms - package structure, interfaces, error handling, concurrency. Use when writing Go code.
---

# Go Patterns

## File Structure

Order: `package` → `import` → `const` → `var` → `type` → functions/methods

## Package Organization

```text
project/
├── cmd/<name>/main.go    # Entry points
├── internal/<domain>/    # Private packages
│   ├── types.go          # Types, const, var, errors
│   ├── repository.go     # Interface + implementation
│   └── service.go        # Business logic
├── pkg/                  # Public packages
└── go.mod
```

For a feature or service under `internal/<domain>/`:

```text
internal/<domain>/
├── model.go        # Types, const, var, errors
├── repository.go   # Interface
├── service.go      # Business logic
├── handler.go      # HTTP layer (if service)
└── service_test.go # Table-driven tests
```

## Feature development workflow

1. **Clarify** - Input/output? Package boundaries? Error handling needs?
2. **Plan** - Package structure, interfaces, types
3. **Build** - Types, interfaces, implementations, tests
4. **Containerize** (if service) - Dockerfile, compose, Makefile targets

## Rules

- **No hardcoding** - Use const, config, or inject
- **Interface at consumer** - Define where used, not where implemented
- **Context first** - Always first parameter, never store in struct
- **Errors wrapped** - `fmt.Errorf("context: %w", err)`
- **Constructor pattern** - `func NewX(...) *X`
- **Options pattern** - `func NewX(opts ...Option) *X` for complex config
- **Table-driven tests** - `tests := []struct{ name, input, want }{...}`

## Concurrency

| Need | Pattern |
| ------ | --------- |
| Background work | `go func() { ... }()` with context |
| Multiple sources | `for { select { case <-ctx.Done(): ... } }` |
| Parallel ops with errors | `errgroup.WithContext(ctx)` |
| Shared state | `sync.Mutex` |
| One-time init | `sync.Once` |
| Wait for goroutines | `sync.WaitGroup` |
| Streaming work | channels + worker pool |
| Fan-out/fan-in | See reference |

See [references/concurrency.go](references/concurrency.go) for Pool, FanOut, Merge, Semaphore.

## Container conventions (services)

- Multi-stage Dockerfile: builder compiles static binary, runtime runs it
- `CGO_ENABLED=0` for fully static binaries with no C library dependency
- `-ldflags="-s -w"` to strip debug symbols
- Non-root user (UID 1001, GID 0) in runtime stage
- Minimal runtime image (no shell, no package manager if possible)
- `.dockerignore` excludes everything not needed for `go build`
- Makefile has `container` target alongside `build`, `test`, `lint`

## Security conventions

- `gosec` in linter config or as standalone target
- `govulncheck` for dependency vulnerability scanning
- Combined `make check` target: fmt, vet, lint, security, test
- No secrets in image layers or build args

## References

- [references/errors.go](references/errors.go) - Error handling utilities
- [references/concurrency.go](references/concurrency.go) - Worker pool, fan-out, semaphore

## Checklist

- Package boundaries clear?
- const/var at file top?
- No hardcoded values?
- Interface at consumer?
- Context as first param?
- Errors wrapped with context?
- Table-driven tests?
- If service: Dockerfile multi-stage, non-root, static binary?
- If service: `.dockerignore` excludes non-build files?
- If service: `gosec` and `govulncheck` in CI/Makefile?
- Background work? → `go func()` with context
- Multiple sources? → `select { }`
- Parallel ops? → errgroup
- Shared state? → sync.Mutex
- One-time init? → sync.Once
- Wait for goroutines? → sync.WaitGroup
- Streaming work? → channels + worker pool

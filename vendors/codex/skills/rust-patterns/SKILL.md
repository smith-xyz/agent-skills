---
name: rust-patterns
description: Rust patterns - module structure, error handling, no clippy warnings, no hardcoding. Use when writing Rust code.
---

# Rust Patterns

## Zero Clippy Warnings

All code must pass `cargo clippy` with no warnings.

## File Structure

Order: `mod` → `use` → `const` → `static` → types → traits → impls → functions

## Module Organization

```text
src/
├── main.rs           # Entry point
├── lib.rs            # Library root, re-exports
├── error/mod.rs      # Error types
├── <domain>/mod.rs   # Feature modules
└── utils/mod.rs      # Shared utilities
```

Within a feature package:

```text
src/<feature>/
├── mod.rs       # Re-exports
├── types.rs     # Structs, enums
└── impl.rs      # Logic
```

## Feature development workflow

1. **Clarify** - Input/output? Error handling? Performance needs?
2. **Plan** - Module structure, types, traits
3. **Build** - Types, traits, implementations, tests
4. **Verify** - `cargo clippy` with zero warnings

## Commands

```bash
cargo clippy
cargo test
cargo fmt
```

## Rules

- **No hardcoding** - Use const, config, or inject
- **thiserror for lib errors** - `#[derive(Error, Debug)]`
- **anyhow for app errors** - `.with_context(|| "...")?`
- **Early return with `?`** - `let x = foo().ok_or(Error::NotFound)?;`
- **Constructor pattern** - `fn new(...) -> Self`
- **Builder pattern** - For complex config with optional fields
- **No `.unwrap()` in production** - Use `?`, `ok_or`, `unwrap_or_default`
- **Avoid cloning** - Borrow or take ownership
- **Document ownership and borrowing** - In doc comments, state whether functions take/return owned values or references, and any lifetime or reuse expectations, so other devs understand the contract

## Performance

- Chain iterators, avoid intermediate collections
- Lazy evaluation with `and_then`, `map`, `filter`
- `&[T]` over `&Vec<T>` for slices

## Async (Tokio)

- `tokio::spawn` for background tasks
- `tokio::select!` for multiple futures
- `mpsc` channels for worker patterns
- Graceful shutdown with broadcast channels

## Macros

Use macros when:

- Reducing repetitive boilerplate (derive-like)
- Compile-time code generation
- DSL creation (test frameworks, builders)
- Variadic functions

Avoid macros when:

- Generics or traits can solve it
- Code clarity matters more
- Debugging is a priority

## References

- [references/error.rs](references/error.rs) - thiserror/anyhow patterns
- [references/ownership.rs](references/ownership.rs) - Document ownership/borrowing at function boundaries
- [references/builder.rs](references/builder.rs) - Builder pattern with validation, typestate
- [references/async.rs](references/async.rs) - Tokio patterns, workers, graceful shutdown
- [references/traits.rs](references/traits.rs) - From, TryFrom, Display, Default, Deref
- [references/testing.rs](references/testing.rs) - Mock patterns, fixtures, table-driven tests
- [references/macros.rs](references/macros.rs) - string_enum!, newtype!, test_cases!

## Checklist

- Zero clippy warnings?
- const at file top?
- No hardcoded values?
- Errors have context?
- No `.unwrap()` in production?
- Tests for critical paths?
- Avoiding unnecessary clones?
- Ownership/borrowing at function boundaries documented for callers?
- Complex config? → Builder pattern
- Async workers? → mpsc + select!
- Repetitive boilerplate? → Consider macro

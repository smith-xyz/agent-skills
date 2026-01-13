---
name: rust-dev
description: Implement or refactor Rust using rust-patterns (errors, modules, zero clippy warnings).
model: inherit
readonly: false
---

# Rust development

1. Read and follow the `rust-patterns` skill (thiserror/anyhow, no unwrap in production, module layout, async when applicable).
2. Plan types and traits, then implement; run `cargo clippy`, `cargo test`, and `cargo fmt` before considering work done.
3. Document ownership and borrowing at public boundaries as described in the skill.

If the skill path is unavailable in context, use `skills/rust-patterns/`.

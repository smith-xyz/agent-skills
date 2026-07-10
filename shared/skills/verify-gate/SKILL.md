---
name: verify-gate
description: >-
  Configure post-turn verification hooks for any project. Detects changed files,
  runs tiered checks (compile → lint → test), feeds failures back as followup
  messages. Use when setting up hooks, configuring CI gating, or adding
  post-turn verification to a project.
disable-model-invocation: true
---

# Verify Gate

Composable hook helper for post-turn verification. Catches regressions between agent turns automatically.

**Complementary to `verifier` agent:** This hook is per-turn, deterministic, and fast (no LLM). The `verifier` agent is per-task, thorough, and LLM-driven. Use both: hook catches regressions between turns; verifier validates completed work.

## Setup

### 1. Copy hook scripts to your project

```bash
cp skills/verify-gate/scripts/post-turn-verify.sh .cursor/hooks/
cp skills/verify-gate/scripts/format-on-edit.sh .cursor/hooks/
chmod +x .cursor/hooks/*.sh
```

### 2. Create `.cursor/hooks.json`

```json
{
  "version": 1,
  "hooks": {
    "stop": [
      {
        "command": ".cursor/hooks/post-turn-verify.sh",
        "loop_limit": 3
      }
    ],
    "afterFileEdit": [
      {
        "command": ".cursor/hooks/format-on-edit.sh",
        "matcher": "Write"
      }
    ]
  }
}
```

### 3. Configure checks (optional)

Set `VERIFY_GATE_CHECKS` in your environment or edit the script directly. Default: auto-detect by file extension.

## How It Works

```
agent turn ends → stop hook fires →
  detect changed files by extension →
  tier 1: compile/typecheck (fast) →
    fail? → followup_message with error
  tier 2: lint (medium) →
    fail? → followup_message with error
  tier 3: test (slow, only if earlier tiers pass) →
    fail? → followup_message with error
  all pass → echo '{}' (no followup)
```

`loop_limit: 3` prevents infinite retry loops. After 3 failed attempts, the hook stops and the agent's turn ends.

## Scripts

| Script | Hook event | Purpose |
|--------|-----------|---------|
| `post-turn-verify.sh` | `stop` | Detect changes, run tiered checks, feed failures back |
| `format-on-edit.sh` | `afterFileEdit` | Auto-format files after write (by extension) |

## Language-Specific Examples

Pre-built gate scripts in `references/examples/`:

| Example | Stack | Checks |
|---------|-------|--------|
| `rust-gate.sh` | Rust | `cargo check` → `clippy -D warnings` → `cargo test` |
| `go-gate.sh` | Go | `go vet` → `golangci-lint` → `go test` |
| `ts-gate.sh` | TypeScript | `tsc --noEmit` → `eslint` → test runner |
| `multi-repo-gate.sh` | Multi-repo | Per-directory detection (caseboard pattern) |

## References

- `references/hooks-json.md` — hooks.json format and event reference
- `references/examples/` — language-specific gate scripts

## Cursor-Only

Hooks are a Cursor feature. Claude Code and Codex do not support hooks.json. For those vendors, use the `verifier` agent or manual verification.

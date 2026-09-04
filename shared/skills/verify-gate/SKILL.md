---
name: verify-gate
description: >-
  Install a post-turn verification hook in a project so compile, lint, and test
  failures are caught automatically between agent turns. Use when setting up a
  verification hook, wiring post-turn checks, or adding automatic regression
  catching to a repo. Installs the gate; tiered-verify defines what runs.
disable-model-invocation: true
---

<!-- r6-ok: documents where each vendor stores hook config; that is the skill's subject -->

# Verify Gate

Wire a `Stop` hook that runs fast checks after every agent turn and feeds
failures straight back. Deterministic and LLM-free, so it costs nothing to
leave on.

**Boundary:** this skill *installs the hook*. What the tiers actually run is
`tiered-verify`'s job — do not redefine check tiers here.

## Vendor support

Hooks are read from `~/.claude/settings.json` by Claude Code, VS Code Copilot,
and Cursor alike, so one wiring covers all three. Cursor also accepts a
project-local `.cursor/hooks.json`. Codex has no hook support — there, run
`tiered-verify` manually.

Project-local hooks are the right scope here: verification commands are
repo-specific.

## Procedure

1. **Detect the stack** and pick a starting script from
   `references/examples/`: `go-gate.sh`, `rust-gate.sh`, `ts-gate.sh`, or
   `multi-repo-gate.sh` for a repo with several sub-projects.
2. **Copy the hook scripts** into the agent-workspace tree and make them
   executable (resolve `<domain>/<repo>` per `agent-artifacts`):

   ```bash
   ROOT="$HOME/agent-workspace/<domain>/<repo>/hooks"
   mkdir -p "$ROOT"
   cp <skill-dir>/scripts/post-turn-verify.sh "$ROOT/"
   cp <skill-dir>/scripts/format-on-edit.sh   "$ROOT/"
   chmod +x "$ROOT"/*.sh
   ```

3. **Register the hook.** Add to the project's hook config, keying off `Stop`.
   Use an absolute path so the hook works regardless of cwd:

   ```json
   {
     "hooks": {
       "Stop": [
         { "hooks": [ { "type": "command",
                        "command": "/Users/<you>/agent-workspace/<domain>/<repo>/hooks/post-turn-verify.sh" } ] }
       ]
     }
   }
   ```

   Prefer expanding `$HOME` when editing by hand. Cursor's project-local
   format uses `"stop"` with a `loop_limit`. See
   [references/hooks-json.md](references/hooks-json.md) for the per-vendor
   shapes.

4. **Wire the tiers to real commands.** Point each tier at a command that
   actually exists in this repo — a gate calling a missing script fails open
   and silently protects nothing.
5. **Cap the retry loop.** Three attempts maximum. Without a cap, a failing
   check and a persistent agent will loop until the turn is killed.
6. **Prove it fires.** Introduce a deliberate error, run a turn, confirm the
   failure comes back, then remove the error.

## How it works

```text
turn ends → Stop hook →
  detect changed files by extension →
  tier 1 compile/typecheck  → fail? report and stop
  tier 2 lint               → fail? report and stop
  tier 3 test (only if 1+2 pass) → fail? report and stop
  all pass → emit {} (silent)
```

Tiers are ordered by cost. Never run tests before the code compiles.

## Constraints

- **Fast tiers only.** Anything over a few seconds belongs in CI or in a
  deliberate `tiered-verify` run, not on every turn.
- **Fail loudly, not silently.** A gate that errors internally must say so.
- **Never auto-commit** from a hook.

## Done when

The hook is registered, every tier points at a command that exists in the repo,
the retry cap is set, and a deliberately introduced error was caught and
reported back — proving the gate actually fires.

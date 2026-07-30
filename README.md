# agent-skills

A gated agent workflow. One canonical set of skills, agents, and rules, plus a
binary that enforces how they get used — across Claude Code, VS Code Copilot,
and Cursor.

<https://github.com/smith-xyz/agent-skills>

## Why this exists

Four problems, in the order they bite:

1. **Skills didn't travel.** Each vendor had its own copy, they drifted, and
   using them was sporadic and easy to forget.
2. **Nothing forced work through them.** Skills were available, not required.
3. **Prompting is habit-forming.** It is easy to keep asking for one more small
   change and lose the ability to write it yourself.
4. **Agent output sprawled.** Artifacts landed everywhere, which is unworkable
   in a monorepo.

The fix is structural, not aspirational: a single install target, and gates
with real teeth.

## How it works

Each vendor reads its own home, so `shared/` is rendered into each one:

| Vendor | Home | Rules land as |
| ------ | ---- | ------------- |
| Claude Code | `~/.claude/` | `CLAUDE.md` |
| VS Code Copilot | `~/.copilot/` | `instructions/*.instructions.md` |
| Cursor | `~/.cursor/` | `rules/*.mdc` |
| Codex | `~/.codex/` | `AGENTS.md` |

VS Code also reads `~/.claude/` for hooks and CLAUDE.md, which is why the gates
only have to be wired once. Everything else is vendor-specific: agents need the
`.agent.md` suffix, and rules become one instruction file per rule so each keeps
its own `applyTo` scope instead of loading on every request.

`agent-gate` is a dependency-free Go binary wired to lifecycle hooks. It
normalizes each vendor's payload format and makes the same decision everywhere.

| Gate | Event | What it does |
| ------ | ------- | -------------- |
| Catalog | `SessionStart` | Injects the skill index and this repo's profiles, so you don't have to remember them |
| Contract | `UserPromptSubmit` | States the routing rule: research is free, execution needs a claimed skill |
| **Route** | `PreToolUse` | **Denies** any edit until a skill or subagent is claimed |
| **Complexity** | `PreToolUse` | **Denies** small, high-judgement edits in your sharpen languages and hands them back to you |
| **Containment** | `PreToolUse` | **Denies** new markdown outside `.agent/` |
| Report | `Stop` | Records what happened for `agent-gate report` |

Reading, searching, and running tests are never gated. The gates fire only on
tools that modify the workspace.

### The handoff card

When the complexity gate fires, you get an actionable card rather than a wall:

```text
YOU WRITE THIS.

  file:    internal/scheduler/queue.go
  do:      impl-plan — add backpressure — bounded chan, drop-oldest
  read:    skill go-patterns
  verify:  go test ./internal/scheduler
  why:     2-line change in a sharpen language (threshold 40)
```

Each file bounces at most once per session, so you are never trapped in a loop.

Genuinely need the agent? `agent-gate override --reason "..."`. It works
immediately, and it shows up in every report — friction, not a wall.

### Seeing the ratio

```bash
make gate-report
```

```text
REPO                     AI EDITS  BOUNCED OVERRIDE   AI LINES
proj                            3        5        1          6

Bounce rate: 5/8 (62%) of mutating calls came back to you.
```

If the bounce rate is zero, the thresholds are wrong.

## Installation

```bash
git clone git@github.com:smith-xyz/agent-skills.git
cd agent-skills
make install-deps      # once: brew install gh jq
make install-vscode    # skills, agents, rules → ~/.copilot/, MCP → user profile
make install-gates     # builds agent-gate, wires hooks for every vendor
make gate-doctor       # verify the wiring is live
```

Run the installer for each vendor you actually use — `install-vscode`,
`install-claude`, `install-cursor`, `install-codex`. They are independent and
all read the same `shared/` tree.

Settings are the one thing not installed automatically. User `settings.json` is
JSONC and often a symlink into a dotfiles repo, so merging it programmatically
either fails to parse or clobbers tracked files. Copy the keys from
`vendors/vscode/settings.json` by hand.

**Codex has no hook support.** It gets the skills and rules but none of the
gates. Treat it as ungated.

Uninstall with `make remove-gates` (leaves the binary and your ledger) or
`make remove-vscode`.

### Configuration

`~/.agent-skills/gates.json`:

```json
{
  "sharpen": ["go", "rust"],
  "assist_only": ["yaml", "json", "md", "tf"],
  "max_hand_lines": 40,
  "repos": {
    "scratch-repo": { "complexity_gate": false }
  }
}
```

`sharpen` languages bounce. `assist_only` never do. Per-repo overrides let
throwaway and infra repos opt out without weakening the default.

Repo identity resolves from the **target file's** path, not the working
directory — so opening a monorepo root still attributes work to the right
project.

## Layout

```text
shared/                  Canonical content — the single source of truth
  skills/<name>/           SKILL.md, plus scripts/ and references/
  agents/*.md              Subagent definitions
  rules/*.mdc              Global rules, rendered per vendor
  mcp/mcp.json             MCP server config
  hooks/                   Portable hook scripts
  scheduling/              launchd/cron for the morning briefing

tools/agent-gate/        The gate engine (Go, no dependencies)
vendors/<vendor>/        Vendor config only: permissions, settings, sandbox
scripts/                 Installers and renderers
```

There is no intermediate render stage. Installers read `shared/` and write to
the vendor target directly — the old committed per-vendor copies were the
source of every drift bug this repo had.

## Skills

The catalog is injected at session start, so it is not duplicated here. To
list it:

```bash
agent-gate catalog
```

Skills follow a rubric — triggerable, a routine, repeatable, focused,
verifiable, portable, distinct. Two skills maintain it:

- **`skill-audit`** scores the catalog against the rubric.
  `bash shared/skills/skill-audit/references/checks.sh` runs the mechanical
  checks.
- **`skill-forge`** scaffolds a new skill to the rubric, so the route gate
  never dead-ends.

Run the audit after adding skills. A hard route into a weak catalog is worse
than no gate at all.

## The `.agent/` convention

Agent output goes in `.agent/` — `notes/`, `research/`, `plans/`,
`diagrams/`, `profiles/`. Gitignore it. The containment gate enforces it.

Per-repo **profiles** at `.agent/profiles/<skill>.md` bind a global skill to
one repo with a defaults table. Global skills carry the routine; profiles carry
the parameters. This keeps skills free of workspace paths while still being
concrete where they run.

See `shared/rules/agent-artifacts.mdc`.

## Permissions

| Vendor | File | Controls |
| -------- | ------ | ---------- |
| Cursor | `permissions.json` | IDE terminal + MCP auto-run allowlists |
| Cursor | `cli-config.json` | CLI allow/deny (`Shell`, `Read`, `Write`, `Mcp`) |
| Claude | `settings.json` | Command permissions, model selection |
| Codex | `config.toml` | Model, sandbox mode |
| Codex | `rules/default.rules` | Starlark execpolicy |
| VS Code | `settings.json` | Terminal auto-approve, sandbox, permission level |

After install, set `GITHUB_PERSONAL_ACCESS_TOKEN` and any other MCP credentials
you use.

## Design notes

- **Gates fail open.** A malformed payload or a crashed engine allows the edit.
  A bug in the gate must never brick an editing session — which is exactly why
  `agent-gate doctor` exists, since a silently dead gate is worse than none.
- **No runtime dependency.** The engine is a static Go binary. The previous
  system died with `bun: not found`; a gate that stops protecting you when a
  runtime goes missing is not a gate.
- **The ledger is JSONL** at `~/.agent-skills/ledger/`, never inside a repo.
  Greppable, and it keeps the binary dependency-free.
- **VS Code ignores hook `matcher` values**, so hooks fire on every tool and all
  matching happens inside the engine. VS Code hooks are Preview and may shift.

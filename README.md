# agent-skills

One canonical set of skills, agents, and rules across Claude Code, VS Code
Copilot, Cursor, Codex, OpenCode, and Pi — plus a Rust `reflect` engine that
learns from sessions offline and proposes skill improvements for you to review.

<https://github.com/smith-xyz/agent-skills>

## Why this exists

1. **Skills didn't travel.** Each vendor had its own copy and they drifted.
2. **AI absorbed the work.** Prompting became habit; sharpening skills atrophied.
3. **Output sprawled.** Artifacts landed everywhere in a monorepo.
4. **Nothing closed the loop.** Repeated asks never became better skills.

The fix: a single install target, soft rules that keep work coherent and
budgets tight, and a **reflection engine** that proposes (never auto-merges)
skill create/amend/delete after sessions.

## How it works

Each vendor reads its own home, so `shared/` is rendered into each one:

| Vendor | Home | Rules land as |
| ------ | ---- | ------------- |
| Claude Code | `~/.claude/` | `CLAUDE.md` |
| VS Code Copilot | `~/.copilot/` | `instructions/*.instructions.md` |
| Cursor | `~/.cursor/` | `rules/*.mdc` |
| Codex | `~/.codex/` | `AGENTS.md` |
| OpenCode | `~/.config/opencode/` | `AGENTS.md` |
| Pi | `~/.pi/agent/` | `AGENTS.md` |

Skills stay **opt-in recipes**, not passports. Soft rules cover work coherence,
output/complexity budgets, and artifact layout. Domain-specific overlays (e.g.
employer scope) live in your workspace/user rules, not in this repo. The
`reflect` binary is wired to SessionStart/Stop hooks (Claude, Cursor, VS Code)
and an OpenCode plugin (`session.created` / `session.idle` → same CLI).

### Reflection engine

```text
chat (quiet) → Stop hook → reflect (Rust) → SQLite ledger
                         → digest → review queue → you accept → catalog
```

| Command | What it does |
| ------- | ------------ |
| `reflect hook session-start` | Injects catalog + coherence reminder |
| `reflect hook stop` | Appends a trace; optional followup if reviews pending |
| `reflect digest` | Clusters recent traces into proposal drafts |
| `reflect status` | `1 new · 1 amended · 0 deleted` |
| `reflect accept\|reject <id>` | Sync draft into `shared/skills/` or drop |
| `reflect install\|remove` | Wire/unwire vendor hooks |

Fail open: a bad hook payload never blocks the session.

Config: `~/.agent-skills/reflect.json` (created on first `reflect install`).

## Installation

```bash
git clone git@github.com:smith-xyz/agent-skills.git
cd agent-skills
make install-deps      # once: brew install gh jq
make install-cursor    # skills, agents, rules → ~/.cursor/
make install-claude
make install-vscode
make install-opencode
make install-pi        # skills, agents, rules → ~/.pi/agent/
make install-reflect   # builds reflect; wires Claude/Cursor/VS Code hooks
```

Uninstall hooks with `make remove-reflect` (leaves the binary and ledger).

Settings are not merged automatically — copy keys from
`vendors/vscode/settings.json` by hand if needed.

## Layout

```text
shared/                  Canonical content — single source of truth
  skills/<name>/           SKILL.md, plus scripts/ and references/
  agents/*.md              Subagent definitions
  rules/*.mdc              Global rules, rendered per vendor
  mcp/mcp.json             MCP server config
  hooks/                   Optional project hooks (verify, format)

tools/reflect/           Reflection engine (Rust)
vendors/<vendor>/        Vendor config only: permissions, settings
scripts/                 Installers and renderers
```

## Skills

```bash
reflect catalog
```

Skills follow a rubric — triggerable, routine, repeatable, focused,
verifiable, portable, distinct. `skill-audit` and `skill-forge` maintain it.

## Artifact layout

Agent scratch lives under `~/agent-workspace/<domain>/<repo>/` (research,
notes, plans, diagrams, profiles, triage) — not in repos. See
`shared/rules/agent-artifacts.mdc`.

Vendor permissions auto-allow that tree (Cursor `cli-config`, Claude
`additionalDirectories`, OpenCode `external_directory`, Codex
`writable_roots`, VS Code sandbox `allowRead`/`allowWrite`). Re-run
`make install-*` to pick up the allowlists.

## Design notes

- **Hooks fail open.** A crashed `reflect` must never brick editing.
- **Static binary.** No runtime dependency for the hook path.
- **Review before catalog write.** Proposals never auto-merge.
- **Ledger stays on the machine** at `~/.agent-skills/`; accept syncs into
  the configured `catalog_path` (this repo by default).

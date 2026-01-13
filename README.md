# Cursor-Plugins

Personally curated commands, skills, and subagents for Cursor or Claude Code.

## Mental model

| Layer | Use for |
| ----- | ------- |
| **Skills** (`skills/<name>/`) | Procedures, style, and stack conventions. Primary place for repeatable patterns and scripts. |
| **Commands** (`commands/*.md`) | Slash playbooks with a **clear outcome** (scripts, `gh`, scaffold). Avoid duplicating full skill bodies here. |
| **Agents** (`agents/*.md`) | Separate context, optional `readonly`. Point at skills so delegated work follows your conventions. |

**Flow:** Skills hold the substance; agents load those skills for bounded tasks; commands stay thin and outcome-focused.

## Layout

- `skills/<name>/` — Instructions, scripts, assets.
- `commands/` — Slash playbooks for named outcomes only.
- `agents/` — [Subagents](https://cursor.com/docs/subagents) (separate context, optional `readonly`). Installed to `~/.cursor/agents/` (and `~/.claude/agents/` when using the claude vendor). Invoke with `/name`.

### Slash commands (outcomes)

| Command | Purpose |
| ------- | ------- |
| `scaffold` | New project from templates (`project-scaffold` skill) |
| `work-review` | Summarize work from transcripts; optional Jira (`work-review` skill) |
| `find-issues` | Find GitHub issues for OSS contribution (`gh`) |
| `reproduce-issue` | Reproduce a GitHub issue / build a test case (`gh`) |

Stack and domain work (Go, React, Python, TypeScript, Rust, OpenShift) lives in **skills** and **subagents** (`/go-dev`, `/react-dev`, etc.), not duplicate slash commands.

## Deps

Homebrew required.

```bash
make install-deps
```

## Installation

Copies `rules/`, `commands/`, `skills/`, and `agents/` into `~/.$vendor/`.

```bash
make install
```

After `make install`, run `make lint` on changed files if you edit markdown.

# agent-skills

Personally curated [Agent Skills](https://agentskills.io/) and subagents for Cursor, Claude Code, and Codex.

https://github.com/smith-xyz/agent-skills

## Mental model

| Layer | Use for |
| ----- | ------- |
| Skills (`skills/<name>/`) | Workflows, conventions, and patterns. Invoke with `/skill-name` or let agent auto-apply. |
| Agents (`agents/*.md`) | Separate context, optional `readonly`. Delegated work with their own context window. |

Skills hold the substance; agents delegate bounded tasks. All skills use `disable-model-invocation: true` for explicit-only invocation unless they should auto-apply (e.g. language patterns).

## Layout

- `skills/<name>/` — SKILL.md + optional scripts, references, assets.
- `agents/` — [Subagents](https://cursor.com/docs/subagents). Installed to `~/.cursor/agents/`. Invoke with `/name`.

### Skills (explicit invocation)

| Skill | Purpose |
| ----- | ------- |
| `brainstorm` | Structured ideation with critical challenge, research subagents |
| `coding-practice` | Generate no-AID coding practice sessions |
| `commit-prep` | Branch name, conventional commit message, PR body from staged changes |
| `fact-check` | Verify claims, citations, URLs with per-claim verdicts |
| `find-issues` | Find GitHub issues for OSS contribution (`gh`) |
| `multi-review` | Parallel sub-agent code review from multiple perspectives |
| `project-scaffold` | New project from templates (Go, Rust, Node, Python, React) |
| `prose-refine` | Edit draft text for discord/slack/github/email preserving voice |
| `reproduce-issue` | Reproduce a GitHub issue / build a test case (`gh`) |
| `work-review` | Summarize work from transcripts; optional Jira mapping |

### Skills (auto-apply by agent)

| Skill | Purpose |
| ----- | ------- |
| `go-patterns` | Go conventions, errors, concurrency |
| `python-patterns` | Python OOP, pydantic, type hints |
| `react-patterns` | React components, hooks, providers |
| `rust-patterns` | Rust modules, error handling, traits |
| `typescript-patterns` | TypeScript strict types, async, DI |
| `openshift-debug` | OpenShift cluster debugging |
| `pqc-readiness` | Post-quantum crypto migration analysis |
| `credentials` | Credential fetching from env vars |
| `jira` | Jira REST API patterns |
| `arxiv-ai-scan` | arXiv paper search |

## Deps

Homebrew required.

```bash
make install-deps
```

## Installation

```bash
git clone git@github.com:smith-xyz/agent-skills.git
cd agent-skills
make install-deps   # once
make install        # copies skills/ and agents/ into ~/.cursor/, ~/.claude/, or ~/.codex/
```

`make install` defaults to the `cursor` vendor. Pass a vendor name or `all`: `./copy-to-global.sh claude`.

After `make install`, run `make lint` on changed files if you edit markdown.

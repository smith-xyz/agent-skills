# Subagents

Markdown files in this directory follow [Cursor subagents](https://cursor.com/docs/subagents): YAML frontmatter plus prompt body. After `make install` / `./copy-to-global.sh`, they copy to `~/.cursor/agents/` (and `~/.claude/agents/` when using the claude vendor). Invoke with `/name` in chat.

Add an agent when you want a **separate context** (long transcripts, verification) or a **readonly** pass. **Stack and domain agents** point at skills so they inherit your conventions without duplicating skill bodies in slash commands.

`model: fast` may fall back depending on plan and org settings.

| Agent | Skill(s) | Notes |
| ----- | -------- | ----- |
| `verifier` | — | Readonly; validate claimed-complete work |
| `work-review` | `work-review` | Readonly; transcripts + optional Jira |
| `go-dev` | `go-patterns` | |
| `react-dev` | `typescript-patterns`, `react-patterns` | |
| `python-dev` | `python-patterns` | |
| `typescript-dev` | `typescript-patterns` | Non-React TS; use `react-dev` for UI |
| `rust-dev` | `rust-patterns` | |
| `openshift-debug` | `openshift-debug` | Readonly; cluster inspection |
| `researcher` | — | Readonly; evidence gathering, no recommendations |

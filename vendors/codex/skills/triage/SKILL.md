---
name: triage
description: >-
  Triage open issues and PRs across repos. Fetch via GitHub MCP, classify,
  score, and render actionable reports with copy-pasteable gh commands. Use when
  user asks to triage issues, review PRs, assess project health, or prioritize backlog.
disable-model-invocation: true
---

# Triage

Readonly issue/PR triage pipeline. Agent fetches data via GitHub MCP; deterministic scripts handle scoring and rendering.

**MCP Dependencies:** GitHub MCP (`search_issues`, `search_pull_requests`, `get_check_runs`)

## Prerequisites

- GitHub MCP server configured in `~/.cursor/mcp.json`
- Target repo: auto-detected from `git remote` or specify in MCP queries

## Scripts

| Script | Purpose |
|--------|---------|
| `./scripts/validate-output.sh <schema> <file>` | Validate agent JSON output against schema |
| `./scripts/score.sh <triage-json>` | Deterministic scoring: reactions + comments + priority |
| `./scripts/render-report.sh <scored-json>` | JSON → markdown report with `gh` commands |

## Workflow

1. **Fetch** — agent uses GitHub MCP `search_issues` and `search_pull_requests` to retrieve open items
2. **Dispatch** — agent classifies fetched data (labels, effort, recommendations)
3. **Validate** — check agent output against `references/output-schemas/*.json`; retry max 2 on failure
4. **Score** — deterministic `score.sh`: `reactions*2 + comments + priority_label`
5. **Render** — `render-report.sh` → `.triage/YYYY-MM-DD-{issues|prs}.md`

## Agent Output Validation

Agent returns JSON matching schemas in `references/output-schemas/`. If validation fails:

1. Show the agent the specific validation error
2. Ask for corrected output
3. Max 2 retries, then proceed with partial data

## Scoring Formula

```
base = reaction_count * 2 + comment_count + severity_multiplier
severity_multiplier: critical=10, high=5, medium=2, low=1
final = base * agent_confidence
```

## Output

Reports at `.triage/YYYY-MM-DD-{issues|prs}.md` with:

- Run summary: items processed, new since last run, unchanged
- Per-item: score, classification, recommendation, copy-pasteable `gh` command
- Grouped by recommendation: REVIEW, CLOSE, MERGE-READY, NEEDS-REPRO

All `gh` mutations are copy-pasteable text — agents never execute them.

## State

Delta detection via `~/.agent-skills/state/triage/last-run.iso` — only re-triage items updated since last run.

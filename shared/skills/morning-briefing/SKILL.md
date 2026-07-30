---
name: morning-briefing
description: >-
  Produce a morning digest combining transcript history with live GitHub/Jira
  data via MCP. Use when user asks for morning brief, daily digest, what needs
  attention, or start of day summary.
disable-model-invocation: true
---

<!-- r6-ok: cross-repo daily tool; its output is intentionally home-scoped, not repo-scoped -->

# Morning Briefing

Yesterday's work comes from transcript analysis. Live GitHub/Jira/CI data comes from MCP servers — no wrapper scripts needed.

**MCP Dependencies:** GitHub MCP (PRs, issues, CI, notifications), Atlassian MCP (Jira tickets)
**Skill Dependencies:** `work-review` (optional retrospective)

## Scripts

| Script | Purpose |
| -------- | --------- |
| `./scripts/morning-briefing.sh` | Collect yesterday's work → `~/.developer/morning-briefing/YYYY-MM-DD.md` |
| `./scripts/collect-yesterday.sh` | Yesterday's work via `work-review` transcript scripts |

## Workflow

1. Run `./scripts/morning-briefing.sh` to collect transcript-based history
2. Agent queries GitHub MCP: `search_pull_requests` (author:me), `list_notifications`, `list_workflow_runs` (status:failure)
3. Agent queries Atlassian MCP: `searchJiraIssuesUsingJql` (assignee = currentUser() AND updated >= -1d)
4. Synthesize into **Act now**, **Waiting on others**, **Shipped**, **Stale** sections
5. Keep synthesis under ~300 words unless user asks for detail

## Digest Sections

| Section | Source | Content |
| --------- | -------- | --------- |
| Yesterday | `collect-yesterday.sh` | Work accomplished from transcripts |
| Action needed | GitHub MCP | Reviews requested, changes requested on my PRs, CI failing |
| Stale | GitHub MCP | PRs with no update in 14+ days |
| Shipped | GitHub MCP | Merged since last run |
| New comments | GitHub MCP | Review comments on my open PRs |
| CI failures | GitHub MCP | Failed workflow runs across watched repos |
| Jira | Atlassian MCP | Assigned tickets updated recently |

## State

- `~/.agent-skills/state/morning-briefing/last-run.iso` — updated after each run for delta queries
- Output: `~/.developer/morning-briefing/YYYY-MM-DD.md`

## Scheduling

See `references/scheduling.md` for launchd plist and crontab templates.
Install via `scheduling/install-schedules.sh install` after running the main installer.

## Done when

The briefing file exists at its dated path, every section either has content or is explicitly marked empty, and the last-run timestamp was updated so the next run computes a correct delta.

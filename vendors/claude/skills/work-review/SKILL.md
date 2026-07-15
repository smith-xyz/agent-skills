---
name: work-review
description: Summarize recent work from agent transcripts and optional Jira mapping. Use when user asks for work review, weekly summary, or sync notes.
disable-model-invocation: true
---

# Work Review

Summarize work from conversation and agent transcript history (vendor-agnostic). Optionally map to Jira when tickets exist. Transcripts are the source of truth; Jira provides optional structure.

**MCP Dependencies:** Atlassian MCP (optional, when mapping to Jira tickets)

## Quick Actions

Run from the work-review skill directory (execution location may vary).

- `./scripts/list-projects.sh [days]` — List projects with recent transcript activity
- `./scripts/extract-transcript.sh <file>` — Extract user queries, files modified, technologies
- `./scripts/extract-plan.sh <file>` — Extract status from a plan file
- `../jira/scripts/fetch-issues.sh [days] [project]` — Optional: fetch Jira issues for mapping

## Parameters

| Parameter | Default        | Description                  |
| --------- | -------------- | ---------------------------- |
| days      | 7              | Number of days to look back  |
| max_words | 500            | Target word count for report |
| style     | casual-bullets | Output style (see below)     |

**Style presets:**

| Style | Format | Jira keys | Resource |
| ----- | ------ | --------- | -------- |
| `casual-bullets` (default) | Plain bullets, one sentence each, no bold/headers | Never | `resources/casual-bullets.md` |
| `sync` | Did/Doing sections | When mapped | `resources/weekly-sync.md` |
| `email` | Numbered list | When mapped | `resources/weekly-email.md` |
| `standard` | Sections with detail | When mapped | `resources/standard.md` |
| `brief` | ~100-150 words | When mapped | `resources/brief.md` |
| `comprehensive` | ~1000+ words | When mapped | `resources/comprehensive.md` |

Parse style from user input: "casual" / "just bullets" / "no jira" / "highlights only" → `casual-bullets`; "sync" / "weekly sync" → `sync`; "email" → `email`; "detailed" / "comprehensive" → `comprehensive`.

## Workflow

1. **Transcripts first** — List transcripts and conversations; extract accomplishments and in-progress items from chats.
2. **Optional Jira** — If user asked for project or ticket context, run `fetch-issues.sh`; attach keys where work clearly matches. If `JIRA_DISABLED` or `JIRA_EMPTY`, proceed transcript-only.
3. **Synthesize** — Pick the format from `resources/` by args (sync, email, brief, standard, comprehensive). Report centered on work; Jira keys only when mapping was requested.

Jira output format: `key|type|summary|status|parent_key|updated`. Group by Epic → Stories → Tasks when organizing by ticket.

## Notes

- Default 7 days, 500 words if unspecified. Parse time ("last 3 days", "past week") and length ("brief", "for an email", "comprehensive") from user input.
- Untracked work: include briefly; don't force a ticket per bullet. Weekly-sync/weekly-email: lead with story or "No user story" when Jira mapping is used.
- Transcript formats: vendor-specific (e.g. .txt, .jsonl); scripts and skill are location-agnostic.

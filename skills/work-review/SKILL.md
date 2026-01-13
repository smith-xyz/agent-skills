---
name: work-review
description: Review recent conversations and agent transcripts to summarize work accomplished
---

# Work Review

Summarize work from conversation and agent transcript history (vendor-agnostic). Optionally map to Jira when tickets exist. Transcripts are the source of truth; Jira provides optional structure.

**Skill Dependencies:** `jira` (optional, when mapping to tickets)

## Quick Actions

Run from the work-review skill directory (execution location may vary).

- `./scripts/list-projects.sh [days]` — List projects with recent transcript activity
- `./scripts/extract-transcript.sh <file>` — Extract user queries, files modified, technologies
- `./scripts/extract-plan.sh <file>` — Extract status from a plan file
- `../jira/scripts/fetch-issues.sh [days] [project]` — Optional: fetch Jira issues for mapping

## Parameters

| Parameter | Default | Description                  |
| --------- | ------- | ---------------------------- |
| days      | 7       | Number of days to look back  |
| max_words | 500     | Target word count for report |

**Length:** `brief` / `short` / `email` → ~100–150 words; `standard` → ~500; `detailed` / `comprehensive` → ~1000+.

**Template:** `weekly-sync` / `sync` → Did/Doing; `weekly-email` / `summary email` → numbered list. When using those templates and Jira mapping is on, each entry leads with user story (key + summary) or "No user story".

**Output examples:** See `resources/` — use the file that matches the requested length/template:

- `resources/weekly-sync.md` — standup/sync Did/Doing
- `resources/weekly-email.md` — weekly summary email numbered list
- `resources/brief.md` — short/email (~100–150 words)
- `resources/standard.md` — standard (~500 words)
- `resources/comprehensive.md` — detailed (~1000+ words)

## Workflow

1. **Transcripts first** — List transcripts and conversations; extract accomplishments and in-progress items from chats.
2. **Optional Jira** — If user asked for project or ticket context, run `fetch-issues.sh`; attach keys where work clearly matches. If `JIRA_DISABLED` or `JIRA_EMPTY`, proceed transcript-only.
3. **Synthesize** — Pick the format from `resources/` by args (sync, email, brief, standard, comprehensive). Report centered on work; Jira keys only when mapping was requested.

Jira output format: `key|type|summary|status|parent_key|updated`. Group by Epic → Stories → Tasks when organizing by ticket.

## Notes

- Default 7 days, 500 words if unspecified. Parse time ("last 3 days", "past week") and length ("brief", "for an email", "comprehensive") from user input.
- Untracked work: include briefly; don't force a ticket per bullet. Weekly-sync/weekly-email: lead with story or "No user story" when Jira mapping is used.
- Transcript formats: vendor-specific (e.g. .txt, .jsonl); scripts and skill are location-agnostic.

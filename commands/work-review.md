---
description: Review recent conversations and agent chats to summarize work done
globs:
alwaysApply: false
---

# Work Review

Summarize recent work from conversation and agent transcript history (vendor-agnostic: e.g. Cursor, Claude, Codex). Optionally map to Jira when tickets exist; much work is not tracked in Jira.

**Skill Dependencies:** `work-review` (optionally `jira` when mapping to tickets)

## Parameters

| Parameter | Default          | Description                        |
| --------- | ---------------- | ---------------------------------- |
| days      | 7                | Number of days to look back        |
| max_words | 500              | Target word count for report       |
| project   | JIRA_PROJECT env | Jira project key (optional)        |

Parse from user request:

- Time: "last 3 days", "past week", "last 30 days"
- Length: "brief", "short" (~100 words), "detailed", "comprehensive" (~1000 words), "for an email" (~150 words)
- Project: "for project X", "Jira project PROJ" (only when user wants ticket mapping)
- Template: "weekly sync" / "sync" → Did/Doing format; "weekly email" / "summary email" → numbered list

## Quick Commands

Run from the work-review skill directory (location depends on where the command is executed—e.g. `skills/work-review/` or project-relative path).

```bash
./scripts/list-projects.sh <days>                  # Find active projects / transcripts
./scripts/extract-transcript.sh <file>            # Extract work evidence from a transcript
../jira/scripts/fetch-issues.sh <days> [project]   # Optional: Jira epics/stories/tasks for mapping
```

## Workflow

1. **Transcripts first** - List agent transcripts and recent conversations; treat them as the source of truth for what was done
2. **Extract work** - Pull accomplishments, decisions, and in-progress items from chats (not from Jira)
3. **Optional Jira mapping** - If user asked for project or ticket context, fetch issues and attach ticket keys where work clearly matches; leave unmapped work as-is
4. **Synthesize** - Report organized by work (theme or time); add Jira keys only when mapping was requested. Call out work that has no ticket where relevant

If agent sandbox blocks network for Jira, run `fetch-issues.sh` in the user's terminal and paste output.

## Weekly sync (dos and don'ts)

- **Do**
  - Use Did/Doing format; keep bullets scannable; mention blockers or follow-ups
  - Include Jira story/task keys in sync notes when the work is tracked so stakeholders can look up details
- **Don't**
  - Force every bullet to have a ticket; untracked work (spikes, tooling, agent-driven tasks) is normal
  - Structure the whole report by Jira epic/story unless the ask is explicitly "report by ticket"

## Checklist

- [ ] Parsed days, max_words, and optional project from user request
- [ ] Ran scripts from the work-review skill directory (cwd or project-relative)
- [ ] Listed and reviewed transcripts/conversations as primary source
- [ ] Extracted work from chats; optionally fetched Jira and mapped where it fits
- [ ] Generated report centered on work done; Jira only where requested or for weekly sync

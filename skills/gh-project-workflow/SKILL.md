---
name: gh-project-workflow
description: Pick a GitHub Project item, plan in plan mode, implement, update project status, and mark Done after merge. Use when the user wants to work from a GH project board, pick up project work, or complete a project item.
disable-model-invocation: true
---

# GitHub Project Workflow

Pick item → plan → implement → update status → Done on merge.

## Prerequisites

- `gh` with `project` scope (`gh auth refresh -s project`)
- `GH_PROJECT_NUMBER` set (or single project on account)

## Script

```bash
./scripts/project.sh get_item
./scripts/project.sh change_status --item-id <ID> --status "In Progress"
./scripts/project.sh change_status --item-id <ID> --status "Done"
```

Env: `GH_PROJECT_OWNER` (default `@me`), `GH_PROJECT_NUMBER`, `GH_PROJECT_QUERY` (default `-status:Done`).

## Workflow

1. **Pick** — `get_item`. Present items; user picks one. If `PROJECT_PICK_NEEDED`, set `GH_PROJECT_NUMBER` and retry.
2. **Plan** — `SwitchMode` to plan. Summarize item; get user approval before coding.
3. **Implement** — `change_status` → `In Progress`. Do the work; user opens PR and pushes.
4. **Sync** — Confirm status is still `In Progress` when PR is ready.
5. **Complete** — Verify merge (`gh pr view --json mergedAt` or user confirms for draft items). `change_status` → `Done`.

Track item `id` and `title` in conversation across steps.

## Edge cases

- **No items**: widen query, e.g. `GH_PROJECT_QUERY='status:Todo' project.sh get_item`
- **Draft items (no PR)**: user confirms merge before Done
- **Resume work**: `GH_PROJECT_QUERY='status:"In Progress"' project.sh get_item`

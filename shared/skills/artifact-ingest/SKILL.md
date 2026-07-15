# artifact-ingest

Ingest untracked markdown files into artifacts.db. Run `discover.sh` to find candidates, then emit each as structured records.

## Parameters

- `domain` (optional) — filter to specific domain
- `dry-run` (optional) — list what would be ingested without emitting

## Prerequisites

- `artifact` CLI on PATH
- `.cursor/artifacts.db` initialized

## Workflow

1. Run discovery: `bash <skill-dir>/scripts/discover.sh [--domain <domain>]`
2. Review candidate list (JSON array)
3. For each candidate:
   - Read the file
   - Determine kind from path mapping rules
   - Extract envelope fields (title, status, next)
   - Emit: `artifact emit --kind <kind> --domain <domain> --title "..." --status <status> --data '{...}'`
4. Report summary: ingested, skipped, errors

## Mapping Rules

| Path pattern | Kind | Default status | Default next |
|---|---|---|---|
| `.backlog/*/phase-*/*.md` | backlog-feature | Infer from content | From acceptance criteria |
| `.backlog/*/specs/*.md` | backlog-feature | waiting | "needs implementation plan" |
| `.backlog/*/hopper/*.md` | backlog-feature | waiting | "needs scoping" |
| `.backlog/*/research/*.md` | research-memo | done | null |
| `.notes/**/*.md` (actionable) | research-memo | done | Extract if present |
| `.notes/**/*.md` (no next action) | skip | — | — |

## Field Extraction

- `title`: First `# heading` in the file
- `domain`: Derived from path (second segment after `.backlog/` or `.notes/`)
- `status`: Infer from content keywords ("done", "completed", "blocked", "waiting", "in progress") or use default from mapping
- `next`: Look for "Next steps", "TODO", "Action items" sections; else use mapping default
- `agent`: "unassigned" for specs/hopper without explicit ownership
- `kind-specific data`:
  - backlog-feature: `goal` = first paragraph after title, `agent` = "unassigned"
  - research-memo: `verdict` = first paragraph or "See source file", `confidence` = "medium"

## Constraints

- Skip files modified >30 days ago (stale)
- Skip files whose title+domain already exist in artifacts.db
- Skip files in `_archive/`, `_synthesis-archive/`, `node_modules/`
- If extraction is ambiguous, skip and log the path
- Never modify the source markdown files

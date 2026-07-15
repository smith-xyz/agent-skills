---
name: project-triage
description: >-
  Triage open issues and PRs for any GitHub repo. Labels audit, backlog
  prioritization with quick-fix plans, PR scoring with duplicate detection.
  Readonly — writes only to <workspace>/.triage/<domain>/<repo>/. Use when
  triaging a project, reviewing open issues, prioritizing backlog, or evaluating PRs.
---

# Project Triage

Readonly triage pipeline. Deterministic scripts fetch/score/render; subagents judge.

Artifacts live in the **opened workspace**, never in project source trees:

```
.triage/<domain>/<repo>/
  triage.db
  issues.md  prs.md  backlog.md
  configs/   # triage.config.yaml, dispatch templates, layout.md, schemas
```

## Config

Each project needs `.triage/<domain>/<repo>/configs/triage.config.yaml`:

```yaml
repo: owner/name
domain: typeorm          # → .triage/<domain>/<repo>/
runtime: bun
agents:
  - issue-triage
  - pr-triage
  - backlog-planner
```

Env vars (set before scripts, or skill sets them from config):

| Var | Purpose | Example |
|-----|---------|---------|
| `TRIAGE_DIR` | Artifact root | `$WORKSPACE/.triage/typeorm/typeorm` |
| `TRIAGE_REPO` | GitHub `owner/repo` | `typeorm/typeorm` |
| `WORKSPACE` | Opened workspace root | auto: `pwd` of mega-workspace |

## Execution Protocol

Scripts live under this skill (`~/.cursor/skills/project-triage/scripts/`).
Run from workspace root with env vars set.

### 1. Init

```bash
export TRIAGE_DIR="$PWD/.triage/<domain>/<repo>"
export TRIAGE_REPO="owner/name"
bun ~/.cursor/skills/project-triage/scripts/init-db.ts
```

### 2. Fetch (parallel)

```bash
bun ~/.cursor/skills/project-triage/scripts/fetch-issues.ts
bun ~/.cursor/skills/project-triage/scripts/fetch-prs.ts
```

### 3. Delta (one per agent)

```bash
bun ~/.cursor/skills/project-triage/scripts/delta.ts --type=all --agent=issue-triage > /tmp/delta-issues.json
bun ~/.cursor/skills/project-triage/scripts/delta.ts --type=all --agent=backlog-planner > /tmp/delta-backlog.json
bun ~/.cursor/skills/project-triage/scripts/delta.ts --type=prs --agent=pr-triage > /tmp/delta-prs.json
```

### 4. Dispatch

Launch 3 subagents in parallel (Task tool, **readonly: true**, types: `issue-triage` | `backlog-planner` | `pr-triage`).

For each:

1. Read `$TRIAGE_DIR/configs/<agent>.md` (dispatch template) — fall back to skill `scripts/templates/dispatch/<agent>.md`
2. Read `$TRIAGE_DIR/configs/<agent>.json` (schema) — fall back to skill `scripts/schemas/<agent>.json`
3. Query labels from `$TRIAGE_DIR/triage.db`
4. Replace placeholders: `{{timestamp}}`, `{{items_json}}`, `{{labels_json}}`, `{{schema_json}}`, `{{all_linked_prs_json}}`, `{{layout}}`, `{{repo}}`
5. Pass rendered template as Task prompt

### 5–8. Validate → Persist → Score → Render

```bash
bun ~/.cursor/skills/project-triage/scripts/validate-output.ts <agent> <output-file> <delta-file>
bun ~/.cursor/skills/project-triage/scripts/persist-results.ts <agent> <output-file>
bun ~/.cursor/skills/project-triage/scripts/score.ts
bun ~/.cursor/skills/project-triage/scripts/render-reports.ts
```

Validate exit 1 → re-dispatch with stderr (max 2 retries).

### 9. Summary

Relay render-reports stdout to user.

## Workspace multi-project

Loop configs to triage everything:

```
for each .triage/*/configs/triage.config.yaml  (or .triage/*/*/configs/):
  set TRIAGE_DIR + TRIAGE_REPO from config
  run protocol
aggregate cross-project summary
```

## Constraints

- Entirely readonly against source repos — never modify source, create branches, or run mutating `gh` commands
- Only writes under `$TRIAGE_DIR`
- All `gh` commands in reports are for the USER to copy-paste

## Artifact Emission

emits: project-triage

After completing triage (persisting results to triage.db), emit a summary record to artifacts.db:

```bash
artifact emit --kind project-triage --domain <domain> --repo <org/repo> \
  --title "Triage: <repo> — <date>" \
  --status <active|done> \
  --next "<next triage action if any>" \
  --source project-triage \
  --data '{"issues_triaged": <N>, "prs_scored": <N>, "quick_fixes": <N>}'
```

Note: project-triage does not yet have a dedicated kind schema. Use the envelope fields only. Emit a suggestion if the schema needs extension:

```bash
artifact suggest --source-skill project-triage --text "project-triage needs dedicated kind schema with issues_triaged/prs_scored fields"
```

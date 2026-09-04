---
name: project-triage
description: >-
  Bulk triage of a GitHub repo's open issues and PRs: scores and classifies
  every item, audits labels, and plans the backlog. Readonly — emits reports
  and copy-pasteable gh commands, never mutations. Use when triaging a project,
  prioritizing a backlog, or doing a sweep across many open items. For an
  in-depth review of one pull request, use code-review instead.
---

# Project Triage

Readonly triage pipeline. Deterministic scripts fetch/score/render; subagents judge.

Artifacts live under `~/agent-workspace/`, never in project source trees:

```text
~/agent-workspace/<domain>/<repo>/triage/
  triage.db
  issues.md  prs.md  backlog.md
  configs/   # triage.config.yaml, dispatch templates, layout.md, schemas
```

## Config

Each project needs
`~/agent-workspace/<domain>/<repo>/triage/configs/triage.config.yaml`:

```yaml
repo: owner/name
domain: typeorm          # → ~/agent-workspace/<domain>/<repo>/triage/
runtime: bun
agents:
  - issue-triage
  - pr-triage
  - backlog-planner
```

Env vars (set before scripts, or skill sets them from config):

| Var | Purpose | Example |
| ----- | --------- | --------- |
| `TRIAGE_DIR` | Artifact root | `$HOME/agent-workspace/typeorm/typeorm/triage` |
| `TRIAGE_REPO` | GitHub `owner/repo` | `typeorm/typeorm` |

## Execution Protocol

Scripts live under this skill (`<skill-dir>/scripts/`).
Run from workspace root with env vars set.

### 1. Init

```bash
export TRIAGE_DIR="$HOME/agent-workspace/<domain>/<repo>/triage"
export TRIAGE_REPO="owner/name"
bun <skill-dir>/scripts/init-db.ts
```

### 2. Fetch (parallel)

```bash
bun <skill-dir>/scripts/fetch-issues.ts
bun <skill-dir>/scripts/fetch-prs.ts
```

### 3. Delta (one per agent)

```bash
bun <skill-dir>/scripts/delta.ts --type=all --agent=issue-triage > /tmp/delta-issues.json
bun <skill-dir>/scripts/delta.ts --type=all --agent=backlog-planner > /tmp/delta-backlog.json
bun <skill-dir>/scripts/delta.ts --type=prs --agent=pr-triage > /tmp/delta-prs.json
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
bun <skill-dir>/scripts/validate-output.ts <agent> <output-file> <delta-file>
bun <skill-dir>/scripts/persist-results.ts <agent> <output-file>
bun <skill-dir>/scripts/score.ts
bun <skill-dir>/scripts/render-reports.ts
```

Validate exit 1 → re-dispatch with stderr (max 2 retries).

### 9. Summary

Relay render-reports stdout to user.

## Workspace multi-project

Loop configs to triage everything:

```text
for each ~/agent-workspace/*/*/triage/configs/triage.config.yaml:
  set TRIAGE_DIR + TRIAGE_REPO from config
  run protocol
aggregate cross-project summary
```

## Constraints

- Entirely readonly against source repos — never modify source, create branches, or run mutating `gh` commands
- Only writes under `$TRIAGE_DIR`
- All `gh` commands in reports are for the USER to copy-paste

## Done when

Every item in scope has a score, a classification, and a recommendation. All suggested mutations are copy-pasteable text that you did not execute. The state file was updated for delta detection.

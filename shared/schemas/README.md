# Artifact Schemas

YAML definitions for structured artifact records. Skills emit validated records to SQLite via `artifact-emit`.

## Tiers

| Tier | Location | Scope |
|------|----------|-------|
| Global | `agent-skills/shared/schemas/` | Envelope + kind schemas shipped with skills |
| Workspace | `<workspace>/.cursor/schemas/domains/` | Domain config (topology, gates, stakeholders) |

Kind schemas are global — one definition shared across all workspaces. Domain configs are workspace-local enrichment.

## Envelope + kind extension

Every artifact has envelope fields (identity, action, state) plus kind-specific extension fields. The envelope schema is universal; each kind YAML adds typed fields stored in a per-kind table keyed by artifact ID.

```
artifacts (envelope)  ──1:1──▶  ghsa_triage (kind fields)
```

## Field types

| Type | Validation |
|------|------------|
| `string` | Optional `max` length |
| `integer` | Whole number |
| `float` | Number |
| `datetime` | ISO 8601 string |
| `enum` | Must match one of `values` |
| `array` | JSON array; `items` sets element type |

## Adding a new kind

1. Create `kinds/<kind-name>.yaml` with `kind`, `version`, `description`, and `fields`
2. Declare `emits: [<kind-name>]` in the skill's `SKILL.md`
3. Run `artifact init-db` to create the new table (or re-run on existing DB)
4. Emit with `artifact emit --kind <kind-name> ...`

Keep kind extensions to ~7 fields. Split overloaded kinds rather than bloating schemas.

## Schema path resolution

CLI finds schemas by walking up from the binary to `shared/schemas/`, or via `ARTIFACT_SCHEMAS_DIR`.

# artifact-emit

Structured artifact tracking CLI for agent workflows.

## Quick start

```bash
./setup.sh
# or manually:
bun install && bun run build
# symlink `artifact` onto PATH
artifact init-db
```

## CLI commands

| Command | Purpose |
|---------|---------|
| `init-db [--db path]` | Create/update DB schema from kind definitions |
| `emit --kind <kind> --domain <domain> --title "..." --status <enum> [...]` | Upsert artifact record |
| `suggest --text "..." [--source-skill name] [--session-id id]` | Log improvement suggestion |
| `link --from <id> --to <id> --rel <rel>` | Create typed relationship between artifacts |
| `validate-domains [--dir path]` | Validate domain YAML configs |
| `plugin [--name <name>] [...]` | Run or list plugins |

## Status values

`done` | `active` | `waiting` | `needs-me` | `stale`

## Link relations

`feeds-into` | `depends-on` | `tracks` | `dupes`

## Skill integration

Skills declare `emits: <kind-name>` in their SKILL.md. The session-end hook reminds agents to emit at session close. Re-emit the same ID with a new `--status` to update status.

## DB convention

Store at `.cursor/artifacts.db` (workspace root). WAL mode enables concurrent access.

## Schemas

- **Kind schemas**: `shared/schemas/kinds/*.yaml`
- **Domain configs**: `.cursor/schemas/domains/*.yaml`

Entry point: [`src/index.ts`](src/index.ts)

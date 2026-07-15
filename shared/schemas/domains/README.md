# Domain Configs

Optional workspace-local YAML that enriches artifact display. Artifacts work without config — config adds system maps, gates, and stakeholder context.

## Format

```yaml
domain: <name>              # required — matches artifact.domain
initiative: "<label>"       # required — portfolio grouping label

topology:                   # optional — system map
  nodes:
    - id: <node-id>
      label: "<display name>"
      type: external-source | internal | external-system  # optional
  edges:
    - from: <node-id>
      to: <node-id>

gates:                      # optional — approval/review checkpoints
  - name: <gate name>
    applies_when: "<condition>"

stakeholders:               # optional — string list
  - Team or group name

delivers_to:                # optional — downstream consumers
  - System or dashboard name
```

## Examples

| File | Level |
|------|-------|
| `examples/minimal.yaml` | domain + initiative only |
| `examples/medium.yaml` | + topology |
| `examples/full.yaml` | + gates, stakeholders, delivers_to |

## Workspace location

Live configs live at `<workspace>/.cursor/schemas/domains/<domain>.yaml`. Validate with:

```bash
artifact validate-domains --dir ~/.cursor/schemas/domains
```

## Incremental adoption

1. Emit artifacts with `--domain <name>` — works immediately
2. Add minimal config (domain + initiative)
3. Add topology when a system map is useful
4. Add gates/stakeholders when workflow context matters

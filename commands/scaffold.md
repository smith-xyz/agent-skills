---
description: Scaffold a new project from templates (Go, Rust, Node.js, React)
globs:
alwaysApply: false
---

# Scaffold Project

**Skill Dependencies:** `project-scaffold`

## Usage

`/scaffold <type> [template] <project-name>`

## Available Templates

| Type | Templates | Default |
| ------ | --------- | ------- |
| `go` | cli, api | cli |
| `rust` | cli, api | cli |
| `node` | cli, api | cli |
| `python` | cli, api | cli |
| `react` | app | app |

## Workflow

1. **Parse** type, template, and project name
2. **Execute** the scaffold script:

```bash
./skills/project-scaffold/scripts/scaffold.sh <type> [template] <project-name>
```

1. **Report** result and next steps

## Examples

- `/scaffold go my-tool` - Go CLI
- `/scaffold go api my-server` - Go API with chi
- `/scaffold rust my-cli` - Rust CLI with clap
- `/scaffold rust api my-api` - Rust API with axum
- `/scaffold node my-script` - Node.js CLI
- `/scaffold node api my-backend` - Node.js API
- `/scaffold python my-tool` - Python CLI with uv
- `/scaffold python api my-api` - Python FastAPI
- `/scaffold react my-app` - React + Vite app

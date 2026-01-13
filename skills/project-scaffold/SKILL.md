---
name: project-scaffold
description: Scaffold new projects from templates - Go, Rust, Node.js, React with cli/api variants. Use when creating a new project.
---

# Project Scaffold

Creates new projects by copying minimal template repos.

## Usage

```bash
./scripts/scaffold.sh <type> [template] <project-name>
```

## Available Templates

| Type | Templates | Default |
| ------ | ----------- | --------- |
| `go` | cli, api | cli |
| `rust` | cli, api | cli |
| `node` | cli, api | cli |
| `python` | cli, api | cli |
| `react` | app | app |

## Examples

```bash
./scripts/scaffold.sh go my-tool           # Go CLI
./scripts/scaffold.sh go api my-server     # Go API (chi)
./scripts/scaffold.sh rust my-cli          # Rust CLI (clap)
./scripts/scaffold.sh rust api my-api      # Rust API (axum)
./scripts/scaffold.sh node my-script       # Node CLI
./scripts/scaffold.sh node api my-backend  # Node API
./scripts/scaffold.sh python my-tool       # Python CLI
./scripts/scaffold.sh python api my-api    # Python FastAPI
./scripts/scaffold.sh react my-app         # React app (Vite)
```

## Template Contents

### go/cli

- cmd/, internal/ structure
- Config with env loading
- Makefile

### go/api

- chi router with middleware
- Health + API routes
- Graceful shutdown
- Multi-stage Dockerfile (non-root, static binary)
- Makefile with build, test, lint, security, container targets

### rust/cli

- clap for args
- thiserror/anyhow errors
- tokio runtime

### rust/api

- axum with tower-http
- tracing for logs
- Health + API routes

### node/cli

- TypeScript strict
- Config module
- tsx for dev

### node/api

- HTTP server (no framework)
- TypeScript strict
- Config module

### python/cli

- uv for package management
- pyproject.toml with ruff (E, W, F, I)
- Python 3.13, line-length 88
- argparse + logging

### python/api

- FastAPI + uvicorn
- pydantic-settings for config
- ruff formatting
- Health + API routes

### react/app

- Vite + React 18
- TypeScript strict
- Minimal App component

## Skill Dependencies

After scaffolding, use:

- `go-patterns` for Go
- `rust-patterns` for Rust
- `typescript-patterns` for Node.js
- `python-patterns` for Python
- `react-patterns` + `typescript-patterns` for React

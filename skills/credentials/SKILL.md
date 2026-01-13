---
name: credentials
description: Fetch credentials from env vars. Use when any skill or command needs API tokens, passwords, or secrets.
---

# Credentials

Retrieve secrets via env vars. Skills and commands that need credentials depend on this skill.

## Lookup

**Env var only.** The credential helper reads from the specified env var. No keychain lookup.

**Why:** Agent and sandboxed contexts cannot access the OS keychain. Scripts run by agents must receive credentials via env vars.

## Best Practice

Store credentials in the OS keychain for interactive use, then export to env in your profile when running in agent contexts:

```bash
# In .zprofile: load from keychain and export
export JIRA_PAT=$(security find-generic-password -s "jira-pat" -a "jira.example.com" -w 2>/dev/null)
```

Or store directly in keychain and add the export line above. When you run commands in your terminal (or launch Cursor from a terminal), the env var is set. Agent execution may not inherit it; run from your terminal when keychain-backed env is required.

**Never plaintext:** No .env files, no config files with tokens.

## Usage

Source the script and call `get_credential`:

```bash
source "$(dirname "$0")/../../credentials/scripts/credentials.sh"
TOKEN=$(get_credential "service" "account" "ENV_VAR") || exit 1
```

**Parameters:**

- `service` - Keychain service name (for error message / store instructions)
- `account` - Keychain account (for error message / store instructions)
- `env_var` - Env var name (e.g. `JIRA_PAT`)

## Platform Store Commands

| Platform | Keychain | Store command |
| -------- | -------- | ------------- |
| macOS | Keychain Access | `echo -n 'TOKEN' \| security add-generic-password -s SERVICE -a ACCOUNT -w - -U` |
| Linux | secret-tool (libsecret) | `echo -n 'TOKEN' \| secret-tool store --label=SERVICE service SERVICE account ACCOUNT` |
| Windows (Git Bash) | None | Use env var only |

## Agent Limitation

Agents and sandboxed execution contexts do not have access to the OS keychain. Credentials must be provided via env var. Users who store in keychain should export in their profile; launch Cursor from a terminal that has the profile loaded for best chance of inheritance.

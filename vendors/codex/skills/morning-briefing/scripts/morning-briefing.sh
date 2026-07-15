#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="${HOME}/.agent-skills/state/morning-briefing"
OUT_DIR="${HOME}/.developer/morning-briefing"
OUT_FILE="${OUT_DIR}/$(date +%Y-%m-%d).md"

mkdir -p "$STATE_DIR" "$OUT_DIR"

{
  echo "# Morning briefing — $(date +%Y-%m-%d)"
  echo

  bash "$SCRIPT_DIR/collect-yesterday.sh" 2>/dev/null || true
} > "$OUT_FILE"

date -u +%Y-%m-%dT%H:%M:%SZ > "$STATE_DIR/last-run.iso"

echo "Digest written to $OUT_FILE"
echo "GitHub/Jira/CI data: use MCP tools (GitHub, Atlassian) interactively"

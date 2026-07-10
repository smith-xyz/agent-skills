#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENDORS=(cursor claude codex vscode)

usage() {
  echo "Usage: $0 [--remove] <vendor|all>"
  echo ""
  echo "  --remove   Uninstall the specified vendor"
  echo "  Vendors: ${VENDORS[*]}, all"
  echo "  Default: cursor"
  exit 1
}

ACTION="install"
[[ "${1:-}" == "--remove" ]] && ACTION="remove" && shift
TARGET="${1:-cursor}"

echo "=== agent-skills $ACTION ==="
echo ""

run_vendor() {
  local vendor=$1
  local script="$SCRIPT_DIR/scripts/install-${vendor}.sh"
  if [[ ! -x "$script" ]]; then
    echo "error: no install script for vendor '$vendor'" >&2
    return 1
  fi
  "$script" "$ACTION"
}

if [[ "$TARGET" == "all" ]]; then
  for v in "${VENDORS[@]}"; do
    run_vendor "$v"
  done
elif printf '%s\n' "${VENDORS[@]}" | grep -qx "$TARGET"; then
  run_vendor "$TARGET"
else
  echo "Unknown vendor: $TARGET"
  usage
fi

if [[ "$ACTION" == "install" ]]; then
  echo ""
  echo "--- Post-install ---"
  echo "1. Set env vars: GITHUB_PERSONAL_ACCESS_TOKEN, DIGITALOCEAN_API_TOKEN, AWS creds"
  echo "2. Atlassian MCP: OAuth browser flow on first use"
  echo "3. Terraform MCP: docker must be running"
  echo "4. Scheduled workflows: ~/.agent-skills/scheduling/install-schedules.sh install"
fi

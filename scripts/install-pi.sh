#!/usr/bin/env bash
# Install skills, agents, and rules for Pi (the earendil-works pi coding agent).
#
# Pi reads personal customizations from ~/.pi/agent:
#   skills  → ~/.pi/agent/skills/<name>/SKILL.md   (discovered recursively)
#   agents  → ~/.pi/agent/agents/<name>.md         (markdown frontmatter)
#   rules   → ~/.pi/agent/AGENTS.md                (global context file)
#
# Notes vs other vendors:
# - Pi has no built-in MCP layer. MCP-style tools are delivered as Pi packages
#   or extensions via the `packages` array in ~/.pi/agent/settings.json, so this
#   installer does not render shared/mcp/mcp.json. See the note printed at the
#   end of an install for how to wire equivalent tooling.
# - Pi has no `readonly` agent frontmatter; render-agent.sh expresses read-only
#   agents by emitting a `tools:` allowlist that omits edit/write.
# - Pi has no `model_tier` mapping we can safely pin (models resolve per machine
#   from the active registry), so rendered agents inherit the current Pi default
#   model unless overridden via subagents.agentOverrides / subagents.defaultModel.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/install-lib.sh"

VENDOR="pi"
ACTION="install"
TARGET=""

usage() {
  cat <<EOF
Usage: $0 [install|remove] [--target /path/to/.pi/agent]

  install               Install to ~/.pi/agent (copy mode)
  install --target DIR  Install to DIR (symlink mode; scoped/workspace target)
  remove [--target DIR] Remove installed assets
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    install|remove) ACTION="$1"; shift ;;
    --target)
      TARGET="${2:?--target requires a path}"
      shift 2
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

if [ -n "$TARGET" ]; then
  INSTALL_HOME="$(cd "$(dirname "$TARGET")" && pwd)/$(basename "$TARGET")"
  mkdir -p "$INSTALL_HOME"
  INSTALL_MODE="link"
  export INSTALL_HOME INSTALL_MODE
fi

PI_HOME="$(vendor_home "$VENDOR")"

case "$ACTION" in
  install)
    echo "--- Installing to $VENDOR ($PI_HOME, mode=$INSTALL_MODE) ---"
    mkdir -p "$PI_HOME"
    install_skills "$VENDOR"
    install_agents "$VENDOR"
    install_rules "$VENDOR"
    install_extensions "$VENDOR"
    cleanup_stale "$VENDOR"
    show_installed "$VENDOR"

    if ! is_workspace_target; then
      echo ""
      echo "  Note: Pi has no native MCP config. To add MCP-style tooling, install"
      echo "  Pi packages/extensions via the \"packages\" array in:"
      echo "    $PI_HOME/settings.json"
      echo "  Restart Pi or run /reload after changing skills, agents, or AGENTS.md."
    fi
    ;;
  remove)
    echo "--- Removing from $VENDOR ($PI_HOME) ---"
    remove_skills "$VENDOR"
    remove_agents "$VENDOR"
    remove_rules "$VENDOR"
    remove_extensions "$VENDOR"
    ;;
esac

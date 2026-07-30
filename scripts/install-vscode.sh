#!/usr/bin/env bash
# Install skills, agents and rules for VS Code Copilot.
#
# VS Code reads personal customizations from ~/.copilot:
#   skills  → ~/.copilot/skills/<name>/SKILL.md
#   agents  → ~/.copilot/agents/*.agent.md
#   rules   → ~/.copilot/instructions/*.instructions.md
#   hooks   → ~/.copilot/hooks/*.json   (wired by install-gates.sh)
#
# MCP is not part of that tree — it lives in the VS Code user profile.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/install-lib.sh"

VENDOR="vscode"
ACTION="${1:-install}"

CODE_USER="$HOME/Library/Application Support/Code/User"
[[ "$(uname)" == "Linux" ]] && CODE_USER="$HOME/.config/Code/User"

case "$ACTION" in
  install)
    echo "--- Installing to $VENDOR ($(vendor_home "$VENDOR"), mode=$INSTALL_MODE) ---"
    install_skills "$VENDOR"
    install_agents "$VENDOR"
    install_rules "$VENDOR"

    if is_workspace_target; then
      echo "  MCP: skipped (workspace target)"
    else
      # Where "MCP: Open User Configuration" writes for the default profile.
      "$REPO_ROOT/scripts/render-mcp.sh" vscode --dest "$CODE_USER/mcp.json"
    fi

    install_scheduling
    cleanup_stale "$VENDOR"
    show_installed "$VENDOR"

    if ! is_workspace_target; then
      echo ""
      echo "  Settings are not merged automatically — user settings.json is JSONC"
      echo "  and often a symlink into a dotfiles repo. Copy the keys from"
      echo "  vendors/vscode/settings.json by hand."
    fi
    ;;
  remove)
    echo "--- Removing from $VENDOR ($(vendor_home "$VENDOR")) ---"
    remove_skills "$VENDOR"
    remove_agents "$VENDOR"
    remove_rules "$VENDOR"
    ;;
  *)
    echo "usage: install-vscode.sh [install|remove]" >&2
    exit 1
    ;;
esac

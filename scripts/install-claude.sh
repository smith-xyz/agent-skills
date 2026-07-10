#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/install-lib.sh"

VENDOR="claude"
ACTION="${1:-install}"

case "$ACTION" in
  install)
    echo "--- Installing to $VENDOR ---"
    install_skills "$VENDOR"
    install_agents "$VENDOR"
    install_rules "$VENDOR"
    install_hooks "$VENDOR"
    install_scheduling

    # Settings → ~/.claude/settings.json (permissions, model)
    if [ -f "$VENDORS/claude/settings.json" ]; then
      mkdir -p "$HOME/.claude"
      cp "$VENDORS/claude/settings.json" "$HOME/.claude/settings.json"
      echo "  settings → ~/.claude/settings.json"
    fi

    # MCP config — merge mcpServers into ~/.claude.json
    local_config="$HOME/.claude.json"
    if [ -f "$local_config" ]; then
      tmp=$(mktemp)
      jq -s '.[0] * {mcpServers: .[1].mcpServers}' "$local_config" \
        <("$REPO_ROOT/scripts/render-mcp.sh" claude) > "$tmp" && mv "$tmp" "$local_config"
      echo "  MCP servers merged → $local_config"
    else
      "$REPO_ROOT/scripts/render-mcp.sh" claude --dest "$local_config"
    fi

    cleanup_stale "$VENDOR"
    show_installed "$VENDOR"
    ;;
  remove)
    echo "--- Removing from $VENDOR ---"
    remove_skills "$VENDOR"
    remove_agents "$VENDOR"
    remove_rules "$VENDOR"
    remove_hooks "$VENDOR"
    [ -f "$HOME/.claude/settings.json" ] && rm -f "$HOME/.claude/settings.json" && echo "  removed settings"
    ;;
esac

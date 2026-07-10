#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/install-lib.sh"

VENDOR="codex"
ACTION="${1:-install}"

case "$ACTION" in
  install)
    echo "--- Installing to $VENDOR ---"
    install_skills "$VENDOR"
    install_agents "$VENDOR"
    install_rules "$VENDOR"
    install_hooks "$VENDOR"
    install_scheduling

    # Settings → ~/.codex/config.toml
    toml_target="$HOME/.codex/config.toml"
    mkdir -p "$(dirname "$toml_target")"
    if [ -f "$VENDORS/codex/config.toml" ]; then
      if [ -f "$toml_target" ]; then
        echo "  config.toml exists — skipping base settings (edit manually)"
      else
        cp "$VENDORS/codex/config.toml" "$toml_target"
        echo "  settings → $toml_target"
      fi
    fi

    # Execpolicy rules → ~/.codex/rules/
    if [ -d "$VENDORS/codex/rules" ]; then
      mkdir -p "$HOME/.codex/rules"
      cp "$VENDORS/codex/rules/"*.rules "$HOME/.codex/rules/" 2>/dev/null || true
      echo "  execpolicy → ~/.codex/rules/"
    fi

    # MCP config — append to config.toml
    rendered=$("$REPO_ROOT/scripts/render-mcp.sh" codex)
    if grep -q '\[mcp_servers\.' "$toml_target" 2>/dev/null; then
      echo "  MCP servers already in config.toml — appending missing entries"
      while IFS= read -r line; do
        if [[ "$line" =~ ^\[mcp_servers\.(.+)\]$ ]]; then
          srv="${BASH_REMATCH[1]}"
          grep -q "\[mcp_servers\.$srv\]" "$toml_target" 2>/dev/null && continue
        fi
        echo "$line" >> "$toml_target"
      done <<< "$rendered"
    else
      echo "$rendered" >> "$toml_target"
      echo "  MCP servers → $toml_target"
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
    [ -f "$HOME/.codex/rules/default.rules" ] && rm -f "$HOME/.codex/rules/default.rules" && echo "  removed execpolicy"
    ;;
esac

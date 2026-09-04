#!/usr/bin/env bash
# Install skills, agents, rules, and config for OpenCode.
#
# OpenCode reads personal customizations from ~/.config/opencode:
#   skills  → ~/.config/opencode/skills/<name>/SKILL.md
#   agents  → ~/.config/opencode/agents/<name>.md
#   rules   → ~/.config/opencode/AGENTS.md  (shared rules)
#   config  → ~/.config/opencode/opencode.json  (permissions, MCP, model)
#
# OpenCode gets skills/agents/rules/permissions. Reflect wires a thin plugin
# (vendors/opencode/plugins/reflect.ts) via `make install-reflect` that calls
# the Rust binary on session.created / session.idle. formatter: true in config.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/install-lib.sh"

VENDOR="opencode"
ACTION="${1:-install}"

# Global vendor config. Never runs for a workspace target.
install_opencode_globals() {
  if is_workspace_target; then
    echo "  config + MCP: skipped (workspace target)"
    return 0
  fi

  local oc_home
  oc_home="$(vendor_home opencode)"
  mkdir -p "$oc_home"

  # Base config (permissions, formatters) — always overwrite from source of truth
  if [ -f "$VENDORS/opencode/opencode.json" ]; then
    local base_config="$VENDORS/opencode/opencode.json"
    local dest_config="$oc_home/opencode.json"

    # Merge MCP servers into the base config
    local mcp_fragment
    mcp_fragment=$("$REPO_ROOT/scripts/render-mcp.sh" opencode)

    if [ -f "$dest_config" ]; then
      # Merge: keep existing non-permission keys, but let vendor base fully
      # replace `permission` (avoid leftover ask/allow entries from older
      # allowlists). Then overlay MCP.
      local tmp
      tmp=$(mktemp)
      jq -s '
        .[0] as $existing |
        .[1] as $base |
        .[2] as $mcp |
        ($existing * $base * $mcp) | .permission = $base.permission
      ' "$dest_config" "$base_config" <(echo "$mcp_fragment") > "$tmp" \
        && mv "$tmp" "$dest_config"
      echo "  config merged → $dest_config"
    else
      # Fresh install: combine base config + MCP
      jq -s '.[0] * .[1]' "$base_config" <(echo "$mcp_fragment") > "$dest_config"
      echo "  config → $dest_config"
    fi
  fi
}

# Append OpenCode-only guidance after the shared AGENTS.md body when present.
append_opencode_rules() {
  local target
  target="$(rules_target opencode)"
  [ -f "$target" ] || return 0
  local dir="$VENDORS/opencode/rules"
  [ -d "$dir" ] || return 0
  for f in "$dir"/*.md; do
    [ -f "$f" ] || continue
    {
      echo ""
      echo "<!-- from vendors/opencode/rules/$(basename "$f") -->"
      cat "$f"
    } >> "$target"
  done
}

case "$ACTION" in
  install)
    echo "--- Installing to $VENDOR ---"
    install_skills "$VENDOR"
    install_agents "$VENDOR"
    install_rules "$VENDOR"
    append_opencode_rules
    install_opencode_globals

    cleanup_stale "$VENDOR"
    show_installed "$VENDOR"

    echo ""
    echo "  Note: reflect OpenCode plugin is installed by make install-reflect."
    echo "  - format-on-edit → handled by \"formatter\": true in opencode.json"
    ;;
  remove)
    echo "--- Removing from $VENDOR ---"
    remove_skills "$VENDOR"
    remove_agents "$VENDOR"
    remove_rules "$VENDOR"
    oc_home="$(vendor_home opencode)"
    [ -f "$oc_home/opencode.json" ] && rm -f "$oc_home/opencode.json" && echo "  removed config"
    [ -f "$oc_home/plugins/reflect.ts" ] && rm -f "$oc_home/plugins/reflect.ts" && echo "  removed reflect plugin"
    ;;
esac

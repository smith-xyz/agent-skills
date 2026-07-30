#!/usr/bin/env bash
# Install skills, agents, rules, and config for OpenCode.
#
# OpenCode reads personal customizations from ~/.config/opencode:
#   skills  → ~/.config/opencode/skills/<name>/SKILL.md
#   agents  → ~/.config/opencode/agents/<name>.md
#   rules   → ~/.config/opencode/AGENTS.md  (concatenated, frontmatter stripped)
#   config  → ~/.config/opencode/opencode.json  (permissions, MCP, model)
#
# OpenCode has no hooks system; the built-in formatter config replaces
# format-on-edit.sh. Other hooks need plugins or AGENTS.md instructions.
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
      # Merge: take existing config, overlay base permissions + MCP servers
      local tmp
      tmp=$(mktemp)
      jq -s '
        .[0] as $existing |
        .[1] as $base |
        .[2] as $mcp |
        ($existing * $base * $mcp)
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

case "$ACTION" in
  install)
    echo "--- Installing to $VENDOR ---"
    install_skills "$VENDOR"
    install_agents "$VENDOR"
    install_rules "$VENDOR"
    # OpenCode has no hooks system — skip install_hooks.
    # format-on-edit is replaced by "formatter": true in opencode.json.
    # notes-budget-gate and post-turn-verify are covered via AGENTS.md rules.
    install_scheduling
    install_opencode_globals

    cleanup_stale "$VENDOR"
    show_installed "$VENDOR"

    echo ""
    echo "  Note: OpenCode has no hooks system."
    echo "  - format-on-edit → handled by \"formatter\": true in opencode.json"
    echo "  - post-turn-verify → add instructions to AGENTS.md or use a plugin"
    echo "  - notes-budget-gate → add instructions to AGENTS.md or use a plugin"
    ;;
  remove)
    echo "--- Removing from $VENDOR ---"
    remove_skills "$VENDOR"
    remove_agents "$VENDOR"
    remove_rules "$VENDOR"
    oc_home="$(vendor_home opencode)"
    [ -f "$oc_home/opencode.json" ] && rm -f "$oc_home/opencode.json" && echo "  removed config"
    ;;
esac

#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/install-lib.sh"

VENDOR="vscode"
ACTION="${1:-install}"

VSCODE_SETTINGS="$HOME/Library/Application Support/Code/User/settings.json"
[[ "$(uname)" == "Linux" ]] && VSCODE_SETTINGS="$HOME/.config/Code/User/settings.json"

# Detect if rules/agents already exist from another vendor install.
has_rules() {
  [ -f "$HOME/.claude/CLAUDE.md" ] || [ -f "$HOME/.codex/AGENTS.md" ]
}

has_agents() {
  local count=0
  count=$(ls -1 "$HOME/.claude/agents/" 2>/dev/null | wc -l | tr -d ' ')
  [ "$count" -gt 0 ] && return 0
  count=$(ls -1 "$HOME/.copilot/agents/" 2>/dev/null | wc -l | tr -d ' ')
  [ "$count" -gt 0 ] && return 0
  return 1
}

case "$ACTION" in
  install)
    echo "--- Installing to $VENDOR ---"

    # Rules — skip if Claude or Codex already installed (VS Code reads both)
    if has_rules; then
      echo "  rules: skipped (VS Code reads existing ~/.claude/CLAUDE.md or ~/.codex/AGENTS.md)"
    else
      install_rules "$VENDOR"
    fi

    # Agents — skip if already present from Claude install
    if has_agents; then
      echo "  agents: skipped (VS Code reads existing ~/.claude/agents/ or ~/.copilot/agents/)"
    else
      if [ -d "$SHARED/agents" ]; then
        local_agents="$HOME/.copilot/agents"
        mkdir -p "$local_agents"
        shopt -s nullglob
        for f in "$SHARED/agents/"*.md; do
          base=$(basename "$f")
          [[ "$base" == "README.md" ]] && continue
          "$REPO_ROOT/scripts/render-agent.sh" --vendor cursor --source "$f" --dest "$local_agents/$base"
        done
        shopt -u nullglob
        echo "  agents → $local_agents"
      fi
    fi

    # MCP config → ~/.vscode/mcp.json (always — format is VS Code specific)
    target="$HOME/.vscode/mcp.json"
    mkdir -p "$(dirname "$target")"
    "$REPO_ROOT/scripts/render-mcp.sh" vscode --dest "$target"

    # Settings — merge agent settings into VS Code user settings.json
    if [ -f "$VENDORS/vscode/settings.json" ]; then
      if [ -f "$VSCODE_SETTINGS" ]; then
        tmp=$(mktemp)
        jq -s '.[0] * .[1]' "$VSCODE_SETTINGS" "$VENDORS/vscode/settings.json" > "$tmp" \
          && mv "$tmp" "$VSCODE_SETTINGS"
        echo "  settings merged → $VSCODE_SETTINGS"
      else
        mkdir -p "$(dirname "$VSCODE_SETTINGS")"
        cp "$VENDORS/vscode/settings.json" "$VSCODE_SETTINGS"
        echo "  settings → $VSCODE_SETTINGS"
      fi
    fi

    echo ""
    echo "  [vscode]"
    echo "  mcp: $target"
    if has_rules; then
      echo "  rules: via Claude/Codex install"
    else
      local rt
      rt=$(rules_target "$VENDOR")
      [ -n "$rt" ] && [ -f "$rt" ] && echo "  rules: $rt"
    fi
    if has_agents; then
      echo "  agents: via Claude install"
    else
      echo "  agents: $(ls -1 "$HOME/.copilot/agents" 2>/dev/null | wc -l | tr -d ' ') items in ~/.copilot/agents/"
    fi
    ;;
  remove)
    echo "--- Removing from $VENDOR ---"
    remove_rules "$VENDOR"

    for src in "$SHARED/agents/"*.md; do
      [ -e "$src" ] || continue
      base=$(basename "$src")
      [[ "$base" == "README.md" ]] && continue
      f="$HOME/.copilot/agents/$base"
      [ -f "$f" ] && rm -f "$f" && echo "  removed agent: $base"
    done
    ;;
esac

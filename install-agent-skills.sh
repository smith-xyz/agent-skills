#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

VENDORS=("cursor" "claude" "codex")

usage() {
  echo "Usage: $0 [vendor|all]"
  echo ""
  echo "Vendors: cursor, claude, codex, all"
  echo "Default: claude"
  exit 1
}

copy_to_vendor() {
  local vendor=$1
  local rules_target="$HOME/.$vendor/rules"
  local commands_target="$HOME/.$vendor/commands"
  local skills_target="$HOME/.$vendor/skills"

  echo "--- Installing to $vendor ---"

  if [ -d "$SCRIPT_DIR/rules" ]; then
    mkdir -p "$rules_target"
    echo "Copying rules to $rules_target..."
    cp "$SCRIPT_DIR/rules/"*.md "$rules_target/" 2>/dev/null
  fi 

  if [ -d "$SCRIPT_DIR/commands" ]; then
    mkdir -p "$commands_target"
    echo "Copying commands to $commands_target..."
    cp "$SCRIPT_DIR/commands/"*.md "$commands_target/" 2>/dev/null
  fi

  if [ -d "$SCRIPT_DIR/skills" ]; then
    mkdir -p "$skills_target"
    echo "Copying skills to $skills_target..."
    for skill_dir in "$SCRIPT_DIR/skills/"*/; do
      if [ -d "$skill_dir" ]; then
        skill_name=$(basename "$skill_dir")
        mkdir -p "$skills_target/$skill_name"
        cp -r "$skill_dir"* "$skills_target/$skill_name/"
      fi
    done
  fi

  if [ -d "$SCRIPT_DIR/agents" ]; then
    local agents_target="$HOME/.$vendor/agents"
    mkdir -p "$agents_target"
    echo "Copying agents to $agents_target..."
    shopt -s nullglob
    for f in "$SCRIPT_DIR/agents/"*.md; do
      cp "$f" "$agents_target/"
    done
    shopt -u nullglob
  fi

  # Copy settings.json for claude vendor
  if [ "$vendor" = "claude" ] && [ -f "$SCRIPT_DIR/.claude/settings.json" ]; then
    local settings_target="$HOME/.$vendor/settings.json"
    echo "Copying settings to $settings_target..."
    cp "$SCRIPT_DIR/.claude/settings.json" "$settings_target"
  fi

  echo ""
}

show_installed() {
  local vendor=$1
  local rules_target="$HOME/.$vendor/rules"
  local commands_target="$HOME/.$vendor/commands"
  local skills_target="$HOME/.$vendor/skills"
  local agents_target="$HOME/.$vendor/agents"
  local settings_file="$HOME/.$vendor/settings.json"

  echo "[$vendor] Rules:"
  ls -1 "$rules_target" 2>/dev/null | sed 's/^/  - /' || echo "  (none)"
  echo "[$vendor] Commands:"
  ls -1 "$commands_target" 2>/dev/null | sed 's/^/  - /' || echo "  (none)"
  echo "[$vendor] Skills:"
  ls -1 "$skills_target" 2>/dev/null | sed 's/^/  - /' || echo "  (none)"
  echo "[$vendor] Agents:"
  ls -1 "$agents_target" 2>/dev/null | sed 's/^/  - /' || echo "  (none)"

  if [ "$vendor" = "claude" ] && [ -f "$settings_file" ]; then
    echo "[$vendor] Settings:"
    echo "  - Permissions configured in $settings_file"
  fi

  echo ""
}

TARGET=${1:-cursor}

echo "=== agent-skills installer ==="
echo ""

if [ "$TARGET" = "all" ]; then
  for vendor in "${VENDORS[@]}"; do
    copy_to_vendor "$vendor"
  done
  echo "Done! Installed to all vendors."
  echo ""
  for vendor in "${VENDORS[@]}"; do
    show_installed "$vendor"
  done
elif [[ " ${VENDORS[*]} " =~ " $TARGET " ]]; then
  copy_to_vendor "$TARGET"
  echo "Done!"
  echo ""
  show_installed "$TARGET"
else
  echo "Unknown vendor: $TARGET"
  usage
fi

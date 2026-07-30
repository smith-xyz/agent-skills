#!/usr/bin/env bash
# Build agent-gate and wire it into every vendor that supports enforcement.
#
# Claude Code, VS Code Copilot and Cursor all read ~/.claude/settings.json,
# so that file is the primary wiring. VS Code also gets a native hook file so
# the gates survive if the Claude compatibility path is ever disabled.
# OpenCode has no hooks JSON — it gets a plugin under ~/.config/opencode/plugins/.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GATE_SRC="$REPO_ROOT/tools/agent-gate"
GATE_HOME="${AGENT_GATE_HOME:-$HOME/.agent-skills}"
BIN_DIR="$GATE_HOME/bin"
BIN="$BIN_DIR/agent-gate"
OC_PLUGIN_SRC="$REPO_ROOT/vendors/opencode/plugins/agent-gate.ts"
OC_PLUGIN_DEST="$HOME/.config/opencode/plugins/agent-gate.ts"

ACTION="${1:-install}"

die() { echo "error: $*" >&2; exit 1; }

build_gate() {
  command -v go >/dev/null 2>&1 || die "go not found on PATH (needed to build agent-gate)"
  mkdir -p "$BIN_DIR"
  ( cd "$GATE_SRC" && go build -o "$BIN" . ) || die "agent-gate build failed"
  echo "  binary → $BIN"
}

# Claude-format hook block. Cursor and VS Code both understand this file.
claude_hooks_json() {
  cat <<EOF
{
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "command", "command": "$BIN hook SessionStart", "timeout": 10 } ] }
    ],
    "UserPromptSubmit": [
      { "hooks": [ { "type": "command", "command": "$BIN hook UserPromptSubmit", "timeout": 10 } ] }
    ],
    "PreToolUse": [
      { "matcher": "*", "hooks": [ { "type": "command", "command": "$BIN hook PreToolUse", "timeout": 10 } ] }
    ],
    "Stop": [
      { "hooks": [ { "type": "command", "command": "$BIN hook Stop", "timeout": 10 } ] }
    ]
  }
}
EOF
}

wire_claude() {
  local settings="$HOME/.claude/settings.json"
  mkdir -p "$(dirname "$settings")"

  if [ ! -f "$settings" ]; then
    echo '{}' > "$settings"
  fi

  # Merge only the hooks key — never clobber permissions or model settings.
  local tmp
  tmp=$(mktemp)
  jq -s '.[0] * {hooks: .[1].hooks}' "$settings" <(claude_hooks_json) > "$tmp" \
    || die "failed to merge hooks into $settings"
  mv "$tmp" "$settings"
  echo "  hooks → $settings (read by Claude Code, VS Code and Cursor)"
}

wire_vscode() {
  local dir="$HOME/.copilot/hooks"
  mkdir -p "$dir"
  claude_hooks_json > "$dir/agent-gate.json"
  echo "  hooks → $dir/agent-gate.json (VS Code native)"
}

wire_cursor() {
  local target="$HOME/.cursor/hooks.json"
  mkdir -p "$(dirname "$target")"

  # Cursor uses its own flat schema with lowerCamelCase event names.
  local rendered
  rendered=$(cat <<EOF
{
  "version": 1,
  "hooks": {
    "sessionStart": [ { "command": "$BIN hook SessionStart", "timeout": 10 } ],
    "beforeSubmitPrompt": [ { "command": "$BIN hook UserPromptSubmit", "timeout": 10 } ],
    "preToolUse": [ { "command": "$BIN hook PreToolUse", "timeout": 10 } ],
    "stop": [ { "command": "$BIN hook Stop", "timeout": 10 } ]
  }
}
EOF
)

  if [ -f "$target" ]; then
    local tmp
    tmp=$(mktemp)
    jq -s '.[0] * .[1]' "$target" <(echo "$rendered") > "$tmp" && mv "$tmp" "$target"
    echo "  hooks merged → $target"
  else
    echo "$rendered" > "$target"
    echo "  hooks → $target"
  fi
}

wire_opencode() {
  [ -f "$OC_PLUGIN_SRC" ] || die "missing OpenCode plugin source: $OC_PLUGIN_SRC"
  mkdir -p "$(dirname "$OC_PLUGIN_DEST")"
  cp "$OC_PLUGIN_SRC" "$OC_PLUGIN_DEST"
  echo "  plugin → $OC_PLUGIN_DEST"
}

unwire() {
  local settings="$HOME/.claude/settings.json"
  if [ -f "$settings" ]; then
    local tmp
    tmp=$(mktemp)
    jq 'del(.hooks)' "$settings" > "$tmp" && mv "$tmp" "$settings"
    echo "  removed hooks from $settings"
  fi
  [ -f "$HOME/.copilot/hooks/agent-gate.json" ] \
    && rm -f "$HOME/.copilot/hooks/agent-gate.json" && echo "  removed VS Code hooks"
  if [ -f "$HOME/.cursor/hooks.json" ]; then
    local tmp
    tmp=$(mktemp)
    jq 'del(.hooks.sessionStart, .hooks.beforeSubmitPrompt, .hooks.preToolUse, .hooks.stop)' \
      "$HOME/.cursor/hooks.json" > "$tmp" && mv "$tmp" "$HOME/.cursor/hooks.json"
    echo "  removed Cursor gate hooks"
  fi
  if [ -f "$OC_PLUGIN_DEST" ]; then
    rm -f "$OC_PLUGIN_DEST" && echo "  removed OpenCode plugin"
  fi
  echo ""
  echo "Gates are off. The binary and your ledger remain at $GATE_HOME."
}

case "$ACTION" in
  install)
    command -v jq >/dev/null 2>&1 || die "jq not found on PATH"
    echo "--- Installing agent-gate ---"
    build_gate
    wire_claude
    wire_vscode
    wire_cursor
    wire_opencode
    echo ""
    "$BIN" doctor || true
    ;;
  remove)
    echo "--- Removing agent-gate wiring ---"
    unwire
    ;;
  *)
    die "usage: install-gates.sh [install|remove]"
    ;;
esac

#!/usr/bin/env bash
# Render vendor-specific rules from shared/rules/*.mdc.
#
# Cursor:  copy .mdc files directly (already have frontmatter)
# Others:  strip frontmatter, concatenate into single file
#
# Usage: render-rules.sh <vendor> [--dest <path>]
#   vendor: cursor | claude | codex | vscode
#   --dest: output directory (cursor) or file path (others). Default: stdout.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RULES_DIR="$SCRIPT_DIR/../shared/rules"

die() { echo "error: $*" >&2; exit 1; }
[[ -d "$RULES_DIR" ]] || die "rules directory not found: $RULES_DIR"

VENDOR="${1:?Usage: render-rules.sh <cursor|claude|codex|vscode>}"
shift

DEST=""
if [[ "${1:-}" == "--dest" ]]; then
  DEST="${2:?--dest requires a path}"
fi

shopt -s nullglob
RULE_FILES=("$RULES_DIR"/*.mdc)
shopt -u nullglob
[[ ${#RULE_FILES[@]} -gt 0 ]] || die "no rule files found in $RULES_DIR"

# Strip YAML frontmatter (--- ... ---) from .mdc content
strip_frontmatter() {
  awk 'BEGIN{fm=0} /^---$/{fm++; next} fm<2{next} {print}' "$1"
}

case "$VENDOR" in
  cursor)
    if [[ -n "$DEST" ]]; then
      mkdir -p "$DEST"
      cp "${RULE_FILES[@]}" "$DEST/"
      echo "Wrote ${#RULE_FILES[@]} rules → $DEST" >&2
    else
      for f in "${RULE_FILES[@]}"; do
        echo "=== $(basename "$f") ==="
        cat "$f"
        echo ""
      done
    fi
    ;;

  claude|codex)
    body=""
    for f in "${RULE_FILES[@]}"; do
      body+="$(strip_frontmatter "$f")"$'\n'
    done
    content="# Global Rules
$body"
    if [[ -n "$DEST" ]]; then
      mkdir -p "$(dirname "$DEST")"
      echo "$content" > "$DEST"
      echo "Wrote $VENDOR rules → $DEST" >&2
    else
      echo "$content"
    fi
    ;;

  vscode)
    body=""
    for f in "${RULE_FILES[@]}"; do
      body+="$(strip_frontmatter "$f")"$'\n'
    done
    content="---
applyTo: \"**\"
---

# Global Rules
$body"
    if [[ -n "$DEST" ]]; then
      mkdir -p "$(dirname "$DEST")"
      echo "$content" > "$DEST"
      echo "Wrote $VENDOR rules → $DEST" >&2
    else
      echo "$content"
    fi
    ;;

  *)
    die "unknown vendor: $VENDOR (expected cursor|claude|codex|vscode)"
    ;;
esac

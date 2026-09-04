#!/usr/bin/env bash
# Render vendor-specific rules from shared/rules/*.mdc.
#
# Cursor:  copy .mdc files directly (already have frontmatter)
# VS Code: one *.instructions.md per rule, mapping globs → applyTo
# Others:  strip frontmatter, concatenate into single file
#
# Usage: render-rules.sh <vendor> [--dest <path>]
#   vendor: cursor | claude | codex | opencode | vscode | pi
#   --dest: output directory (cursor, vscode) or file path (others). Default: stdout.
# Pi reads a single AGENTS.md, so it uses the concatenated-file branch.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RULES_DIR="$SCRIPT_DIR/../shared/rules"

die() { echo "error: $*" >&2; exit 1; }
[[ -d "$RULES_DIR" ]] || die "rules directory not found: $RULES_DIR"

VENDOR="${1:?Usage: render-rules.sh <cursor|claude|codex|opencode|vscode|pi>}"
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

# Read a scalar field out of the .mdc frontmatter.
fm_field() {
  awk -v key="$2" '
    /^---$/ { if (++fm == 2) exit; next }
    fm == 1 && index($0, key ":") == 1 {
      sub("^" key ": *", "")
      print
      exit
    }
  ' "$1"
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

  claude|codex|opencode|pi)
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
    # One instruction file per rule so each keeps its own applyTo scope.
    # Concatenating them all under applyTo:"**" would load every rule into
    # context on every request, which is the documented anti-pattern.
    [[ -n "$DEST" ]] || die "vscode requires --dest <dir>"
    mkdir -p "$DEST"
    for f in "${RULE_FILES[@]}"; do
      name=$(basename "$f" .mdc)
      desc=$(fm_field "$f" description)
      globs=$(fm_field "$f" globs)
      always=$(fm_field "$f" alwaysApply)

      # alwaysApply maps to applyTo:"**"; an explicit globs list maps straight
      # across. A rule with neither stays discovery-only via its description.
      if [[ "$always" == "true" ]]; then
        apply='"**"'
      elif [[ -n "$globs" ]]; then
        apply="$globs"
      else
        apply=""
      fi

      out="$DEST/$name.instructions.md"
      {
        echo "---"
        [[ -n "$desc" ]] && echo "description: $desc"
        [[ -n "$apply" ]] && echo "applyTo: $apply"
        echo "---"
        echo ""
        strip_frontmatter "$f"
      } > "$out"
    done
    echo "Wrote ${#RULE_FILES[@]} $VENDOR instruction files → $DEST" >&2
    ;;

  *)
    die "unknown vendor: $VENDOR (expected cursor|claude|codex|opencode|vscode|pi)"
    ;;
esac

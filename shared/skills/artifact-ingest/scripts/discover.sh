#!/usr/bin/env bash
set -euo pipefail

DB="${ARTIFACT_DB:-$(pwd)/.cursor/artifacts.db}"
DOMAIN_FILTER="${1:-}"

if [ ! -f "$DB" ]; then
  echo "Error: artifacts.db not found at $DB" >&2
  exit 1
fi

candidates=$(find "$(pwd)/.backlog" "$(pwd)/.notes" -name "*.md" -mtime -30 \
  -not -path "*/_archive/*" \
  -not -path "*/_synthesis-archive/*" \
  -not -path "*/node_modules/*" \
  -not -path "*/_review/*" \
  2>/dev/null || true)

echo "["
first=true
while IFS= read -r filepath; do
  [ -z "$filepath" ] && continue

  title=$(grep -m1 '^# ' "$filepath" 2>/dev/null | sed 's/^# //' || echo "")
  [ -z "$title" ] && continue

  rel_path="${filepath#$(pwd)/}"
  domain=$(echo "$rel_path" | cut -d'/' -f2)

  if [ -n "$DOMAIN_FILTER" ] && [ "$domain" != "$DOMAIN_FILTER" ]; then
    continue
  fi

  category="unknown"
  case "$rel_path" in
    .backlog/*/phase-*/*) category="phase-task" ;;
    .backlog/*/specs/*) category="spec" ;;
    .backlog/*/hopper/*) category="hopper" ;;
    .backlog/*/research/*) category="research" ;;
    .notes/*) category="note" ;;
  esac

  existing=$(sqlite3 "$DB" "SELECT COUNT(*) FROM artifacts WHERE domain='$(echo "$domain" | sed "s/'/''/g")' AND title='$(echo "$title" | sed "s/'/''/g")';" 2>/dev/null || echo "0")
  [ "$existing" != "0" ] && continue

  mtime=$(stat -f "%Sm" -t "%Y-%m-%d" "$filepath" 2>/dev/null || stat --format="%y" "$filepath" 2>/dev/null | cut -d' ' -f1 || echo "unknown")

  if [ "$first" = true ]; then
    first=false
  else
    echo ","
  fi
  printf '  {"path": "%s", "title": "%s", "domain": "%s", "category": "%s", "mtime": "%s"}' \
    "$rel_path" \
    "$(echo "$title" | sed 's/"/\\"/g')" \
    "$domain" \
    "$category" \
    "$mtime"

done <<< "$candidates"

echo ""
echo "]"

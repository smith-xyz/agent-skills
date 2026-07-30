#!/usr/bin/env bash
# afterFileEdit hook: enforce line budget on .notes/ and .plans/ files.
# Deterministic gate — rejects writes over 120 lines to research/plan paths.
set -euo pipefail

input=$(cat)
filepath=$(echo "$input" | jq -r '.path // empty')

[[ -z "$filepath" ]] && echo '{}' && exit 0

MAX_LINES=120

# Only gate .notes/ and .plans/ paths
case "$filepath" in
  */.notes/*|*/.plans/*)
    ;;
  *)
    echo '{}'
    exit 0
    ;;
esac

# Skip synthesis archives and _archive (those are allowed to be large)
case "$filepath" in
  */_synthesis-archive/*|*/_archive/*)
    echo '{}'
    exit 0
    ;;
esac

[[ ! -f "$filepath" ]] && echo '{}' && exit 0

lines=$(wc -l < "$filepath" | tr -d ' ')

if [[ "$lines" -gt "$MAX_LINES" ]]; then
  echo "{\"error\": \"BUDGET GATE: ${filepath} has ${lines} lines (max ${MAX_LINES}). Trim it, or move architecture content into a diagram via the excalidraw-diagram skill.\"}"
  exit 1
fi

echo '{}'
exit 0

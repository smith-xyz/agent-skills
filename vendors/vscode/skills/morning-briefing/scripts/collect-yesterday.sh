#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LIST_PROJECTS="$SCRIPT_DIR/../../work-review/scripts/list-projects.sh"
EXTRACT="$SCRIPT_DIR/../../work-review/scripts/extract-transcript.sh"

echo "## Yesterday's work"

if [[ ! -x "$LIST_PROJECTS" ]]; then
  echo "- (skipped — work-review scripts not found)"
  exit 0
fi

PROJECTS=$("$LIST_PROJECTS" 1 2>/dev/null) || true
if [[ -z "$PROJECTS" ]] || [[ "$PROJECTS" == *"==="* && $(echo "$PROJECTS" | wc -l) -le 2 ]]; then
  echo "- (no recent transcript activity)"
  exit 0
fi

echo "$PROJECTS" | grep -v "^===" | head -10 | while IFS='|' read -r modified vendor project file; do
  [[ -z "$file" ]] && continue
  echo "### ${project} (${vendor})"
  if [[ -x "$EXTRACT" && -f "$file" ]]; then
    "$EXTRACT" "$file" 2>/dev/null | head -15
  else
    echo "- ${modified} ${file}"
  fi
  echo
done

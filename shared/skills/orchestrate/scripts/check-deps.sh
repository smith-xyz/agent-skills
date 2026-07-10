#!/usr/bin/env bash
# Parse Depends on: fields from backlog task files and output DAG + ready tasks.
# Usage: check-deps.sh <backlog-dir> [state-log]
set -euo pipefail

BACKLOG_DIR="${1:?Usage: check-deps.sh <backlog-dir> [state-log]}"
STATE_LOG="${2:-}"

if [[ ! -d "$BACKLOG_DIR" ]]; then
  echo "Backlog directory not found: $BACKLOG_DIR" >&2
  exit 1
fi

declare -A DEPS
declare -A STATUS

# Parse state log for completed tasks
if [[ -n "$STATE_LOG" && -f "$STATE_LOG" ]]; then
  while IFS='|' read -r ts task_id status rest; do
    task_id=$(echo "$task_id" | xargs)
    status=$(echo "$status" | xargs)
    STATUS["$task_id"]="$status"
  done < "$STATE_LOG"
fi

# Parse task files for dependencies
for f in "$BACKLOG_DIR"/*.md; do
  [[ -f "$f" ]] || continue
  base=$(basename "$f" .md)
  task_id=$(echo "$base" | grep -oE '^[0-9]+\.[0-9]+' || echo "$base")

  deps=$(grep -i "^\\*\\*Depends on:" "$f" 2>/dev/null | sed 's/.*Depends on:\*\*//; s/^ *//' || echo "none")
  if [[ "$deps" == "none" || -z "$deps" ]]; then
    DEPS["$task_id"]=""
  else
    DEPS["$task_id"]="$deps"
  fi
done

echo "=== Dependency Graph ==="
for task in $(echo "${!DEPS[@]}" | tr ' ' '\n' | sort); do
  dep="${DEPS[$task]}"
  status="${STATUS[$task]:-pending}"
  echo "$task ($status) → depends on: ${dep:-none}"
done

echo
echo "=== Ready Tasks (no unmet deps) ==="
for task in $(echo "${!DEPS[@]}" | tr ' ' '\n' | sort); do
  status="${STATUS[$task]:-pending}"
  [[ "$status" == "pass" ]] && continue

  dep_str="${DEPS[$task]}"
  if [[ -z "$dep_str" ]]; then
    echo "$task"
    continue
  fi

  all_met=true
  for dep in $(echo "$dep_str" | tr ',' '\n' | xargs); do
    dep_status="${STATUS[$dep]:-pending}"
    if [[ "$dep_status" != "pass" ]]; then
      all_met=false
      break
    fi
  done

  $all_met && echo "$task"
done

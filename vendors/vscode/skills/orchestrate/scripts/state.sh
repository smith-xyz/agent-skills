#!/usr/bin/env bash
# State log helpers for orchestrate skill.
# Usage:
#   state.sh read <log-file>                    — show all entries
#   state.sh status <log-file> <task-id>        — show latest status for a task
#   state.sh append <log-file> <task-id> <status> <summary> [attempts]
set -euo pipefail

ACTION="${1:?Usage: state.sh <read|status|append> ...}"
LOG="${2:?Usage: state.sh $ACTION <log-file> ...}"

case "$ACTION" in
  read)
    if [[ ! -f "$LOG" ]]; then
      echo "(no state log yet)"
      exit 0
    fi
    cat "$LOG"
    ;;

  status)
    TASK_ID="${3:?Usage: state.sh status <log> <task-id>}"
    if [[ ! -f "$LOG" ]]; then
      echo "none"
      exit 0
    fi
    grep "| ${TASK_ID} |" "$LOG" | tail -1 | awk -F'|' '{gsub(/^ +| +$/, "", $3); print $3}'
    ;;

  append)
    TASK_ID="${3:?Usage: state.sh append <log> <task-id> <status> <summary> [attempts]}"
    STATUS="${4:?Usage: state.sh append <log> <task-id> <status> <summary> [attempts]}"
    SUMMARY="${5:-}"
    ATTEMPTS="${6:-1}"
    TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

    mkdir -p "$(dirname "$LOG")"
    echo "${TIMESTAMP} | ${TASK_ID} | ${STATUS} | ${SUMMARY} | attempts=${ATTEMPTS}" >> "$LOG"
    ;;

  *)
    echo "Unknown action: $ACTION" >&2
    echo "Usage: state.sh <read|status|append> ..." >&2
    exit 1
    ;;
esac

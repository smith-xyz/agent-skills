#!/usr/bin/env bash
# Parse acceptance criteria from a backlog task file and run executable checks.
# Usage: validate-task.sh <task-file> [workspace]
set -uo pipefail

TASK_FILE="${1:?Usage: validate-task.sh <task-file> [workspace]}"
WORKSPACE="${2:-$(pwd)}"

if [[ ! -f "$TASK_FILE" ]]; then
  echo "FAIL: task file not found: $TASK_FILE"
  exit 1
fi

echo "=== Validating: $TASK_FILE ==="

failures=0
checked=0
manual=0

in_ac=false
while IFS= read -r line; do
  if [[ "$line" =~ ^##[[:space:]]*Acceptance ]]; then
    in_ac=true
    continue
  fi
  if $in_ac && [[ "$line" =~ ^## ]]; then
    break
  fi
  if $in_ac && [[ "$line" =~ ^-[[:space:]] ]]; then
    criterion="${line#- }"

    # Extract backtick-wrapped commands
    cmd=$(echo "$criterion" | grep -oE '`[^`]+`' | head -1 | tr -d '`')

    if [[ -n "$cmd" ]]; then
      # Test commands
      if echo "$cmd" | grep -qE '(go test|cargo test|bun test|pnpm test|npm test|pytest|vitest|jest)'; then
        output=$(cd "$WORKSPACE" && eval "$cmd" 2>&1)
        rc=$?
        checked=$((checked + 1))
        if [[ $rc -eq 0 ]]; then
          echo "PASS: $criterion"
        else
          echo "FAIL: $criterion (exit $rc)"
          echo "$output" | tail -5
          failures=$((failures + 1))
        fi
        continue
      fi

      # Curl commands
      if echo "$cmd" | grep -qE '^curl '; then
        output=$(eval "$cmd" 2>&1)
        rc=$?
        checked=$((checked + 1))
        if [[ $rc -eq 0 ]]; then
          echo "PASS: $criterion"
        else
          echo "FAIL: $criterion (exit $rc)"
          failures=$((failures + 1))
        fi
        continue
      fi

      # Build/compile commands
      if echo "$cmd" | grep -qE '(go build|cargo build|cargo check|tsc|pnpm build|bun build)'; then
        output=$(cd "$WORKSPACE" && eval "$cmd" 2>&1)
        rc=$?
        checked=$((checked + 1))
        if [[ $rc -eq 0 ]]; then
          echo "PASS: $criterion"
        else
          echo "FAIL: $criterion (exit $rc)"
          echo "$output" | tail -5
          failures=$((failures + 1))
        fi
        continue
      fi
    fi

    manual=$((manual + 1))
    echo "MANUAL: $criterion"
  fi
done < "$TASK_FILE"

echo
echo "=== Results: $checked checked, $failures failed, $manual manual ==="
exit $failures

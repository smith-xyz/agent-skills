#!/usr/bin/env bash
# Check if vendors/ rendered output matches what shared/ would produce.
# Exits 0 if in sync, 1 if drifted. Run via: make check-drift
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENDORS="$REPO_ROOT/vendors"

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

# Render to temp
VENDORS="$TMPDIR/vendors" "$REPO_ROOT/scripts/render-all.sh" > /dev/null 2>&1

DRIFTED=0
for vendor in cursor claude codex vscode; do
  expected="$TMPDIR/vendors/$vendor"
  actual="$REPO_ROOT/vendors/$vendor"

  for subdir in agents skills; do
    [ -d "$expected/$subdir" ] || continue

    # Files in expected but missing or different in actual
    while IFS= read -r -d '' f; do
      rel="${f#$expected/}"
      actual_f="$actual/$rel"
      if [ ! -e "$actual_f" ]; then
        echo "MISSING  $vendor/$rel"
        DRIFTED=1
      elif ! diff -q "$f" "$actual_f" > /dev/null 2>&1; then
        echo "CHANGED  $vendor/$rel"
        DRIFTED=1
      fi
    done < <(find "$expected/$subdir" -type f -print0)

    # Files in actual but not in expected (stale)
    if [ -d "$actual/$subdir" ]; then
      while IFS= read -r -d '' f; do
        rel="${f#$actual/}"
        expected_f="$expected/$rel"
        if [ ! -e "$expected_f" ]; then
          echo "STALE    $vendor/$rel"
          DRIFTED=1
        fi
      done < <(find "$actual/$subdir" -type f -print0)
    fi
  done
done

if [ "$DRIFTED" -eq 0 ]; then
  echo "OK — vendors/ in sync with shared/"
else
  echo ""
  echo "Run 'make render' to update vendors/ from shared/"
  exit 1
fi

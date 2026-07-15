#!/bin/bash
set -e

DAYS=${1:-7}

echo "=== Plans modified in last $DAYS days ==="
echo

for vendor in cursor claude codex; do
  vendor_dir="$HOME/.$vendor"
  [ ! -d "$vendor_dir/plans" ] && continue

  find "$vendor_dir/plans" -name "*.plan.md" -mtime -"$DAYS" 2>/dev/null | \
    while read -r file; do
      name=$(basename "$file" .plan.md | sed 's/_[a-f0-9]*$//')
      modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null | cut -d. -f1)
      echo "$modified|$vendor|$name|$file"
    done
done | sort -r

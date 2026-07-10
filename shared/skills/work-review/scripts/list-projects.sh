#!/bin/bash
set -e

DAYS=${1:-7}

echo "=== Projects with activity in last $DAYS days ==="
echo

for vendor in cursor claude codex; do
  vendor_dir="$HOME/.$vendor"
  [ ! -d "$vendor_dir/projects" ] && continue

  if [ "$vendor" = "cursor" ]; then
    find "$vendor_dir/projects" -name "*.txt" -mtime -"$DAYS" -path "*/agent-transcripts/*" 2>/dev/null | \
      while read -r file; do
        project=$(echo "$file" | sed 's|.*/projects/||; s|/agent-transcripts/.*||')
        modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null | cut -d. -f1)
        echo "$modified|cursor|$project|$file"
      done
  else
    find "$vendor_dir/projects" -name "*.jsonl" -mtime -"$DAYS" 2>/dev/null | \
      while read -r file; do
        project=$(echo "$file" | sed "s|.*/projects/||; s|/[^/]*$||; s|^-||")
        modified=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$file" 2>/dev/null || stat -c "%y" "$file" 2>/dev/null | cut -d. -f1)
        echo "$modified|$vendor|$project|$file"
      done
  fi
done | sort -r | uniq

#!/bin/bash
set -e

FILE=${1:?Usage: extract-plan.sh <plan-file>}

if [ ! -f "$FILE" ]; then
    echo "File not found: $FILE"
    exit 1
fi

echo "=== Plan: $(basename "$FILE" .plan.md) ==="
echo

awk '
/^---$/ { in_frontmatter = !in_frontmatter; next }
in_frontmatter && /^name:/ { print "Name:", substr($0, 7) }
in_frontmatter && /^overview:/ { print "Overview:", substr($0, 11) }
in_frontmatter && /status: completed/ { completed++ }
in_frontmatter && /status: in_progress/ { in_progress++ }
in_frontmatter && /status: pending/ { pending++ }
END {
    print ""
    print "Status: " completed " completed, " in_progress " in progress, " pending " pending"
}
' "$FILE"

echo
echo "--- Completed Tasks ---"
awk '
/^---$/ { fm = !fm; next }
fm && /content:/ { content = substr($0, index($0, "content:") + 9) }
fm && /status: completed/ && content { print "- " content; content = "" }
' "$FILE" | head -10

echo
echo "--- In Progress ---"
awk '
/^---$/ { fm = !fm; next }
fm && /content:/ { content = substr($0, index($0, "content:") + 9) }
fm && /status: in_progress/ && content { print "- " content; content = "" }
' "$FILE"

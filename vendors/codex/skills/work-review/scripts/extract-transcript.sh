#!/bin/bash
set -e

FILE=${1:?Usage: extract-transcript.sh <transcript-file>}

if [ ! -f "$FILE" ]; then
    echo "File not found: $FILE"
    exit 1
fi

echo "=== Transcript: $(basename "$FILE") ==="
echo

if [[ "$FILE" == *.jsonl ]]; then
    echo "--- User Queries ---"
    grep '"role":"user"' "$FILE" | sed 's/.*"content":"\([^"]*\)".*/\1/' | head -20

    echo
    echo "--- Files Modified ---"
    grep -oE "(Created|Modified|Wrote|Write)[^\"]*\.(ts|tsx|js|jsx|go|py|rs|sh|md|yaml|yml)" "$FILE" | sort -u | head -20

    echo
    echo "--- Technologies ---"
    grep -oE "(React|TypeScript|Go|Rust|Python|OpenShift|Kubernetes|eBPF|TLS|PostgreSQL|Redis)" "$FILE" | sort -u | tr '\n' ', ' | sed 's/,$/\n/'
else
    echo "--- User Queries ---"
    sed -n '/<user_query>/,/<\/user_query>/p' "$FILE" | grep -v "user_query>" | head -20

    echo
    echo "--- Files Modified ---"
    grep -oE "(Created|Modified|Wrote|Write).*\.(ts|tsx|js|jsx|go|py|rs|sh|md|yaml|yml)" "$FILE" | sort -u | head -20

    echo
    echo "--- Technologies ---"
    grep -oE "(React|TypeScript|Go|Rust|Python|OpenShift|Kubernetes|eBPF|TLS|PostgreSQL|Redis)" "$FILE" | sort -u | tr '\n' ', ' | sed 's/,$/\n/'
fi

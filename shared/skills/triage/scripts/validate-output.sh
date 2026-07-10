#!/usr/bin/env bash
# Validate agent JSON output against a schema.
# Uses jq for basic structural checks (no external JSON schema validator needed).
# Exit 0 = valid, Exit 1 = invalid with error details on stderr.
set -euo pipefail

SCHEMA="${1:?Usage: validate-output.sh <schema-file> <output-file>}"
OUTPUT="${2:?Usage: validate-output.sh <schema-file> <output-file>}"

if [[ ! -f "$SCHEMA" ]]; then
  echo "Schema not found: $SCHEMA" >&2
  exit 1
fi

if [[ ! -f "$OUTPUT" ]]; then
  echo "Output not found: $OUTPUT" >&2
  exit 1
fi

# Basic JSON validity
if ! jq empty "$OUTPUT" 2>/dev/null; then
  echo "Invalid JSON in $OUTPUT" >&2
  exit 1
fi

REQUIRED_FIELDS=$(jq -r '.required // [] | .[]' "$SCHEMA" 2>/dev/null)

for field in $REQUIRED_FIELDS; do
  if ! jq -e "has(\"$field\")" "$OUTPUT" >/dev/null 2>&1; then
    echo "Missing required field: $field" >&2
    exit 1
  fi
done

ITEMS_TYPE=$(jq -r '.properties.items.type // empty' "$SCHEMA" 2>/dev/null)
if [[ "$ITEMS_TYPE" == "array" ]]; then
  ITEM_COUNT=$(jq '.items | length' "$OUTPUT" 2>/dev/null || echo 0)
  if [[ "$ITEM_COUNT" -eq 0 ]]; then
    echo "Warning: items array is empty" >&2
  fi
fi

echo "Validation passed"
exit 0

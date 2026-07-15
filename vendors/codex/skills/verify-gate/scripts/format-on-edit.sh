#!/usr/bin/env bash
# afterFileEdit hook: auto-format files by extension after writes.
set -euo pipefail

input=$(cat)
filepath=$(echo "$input" | jq -r '.path // empty')

[[ -z "$filepath" ]] && exit 0

case "$filepath" in
  *.go)
    command -v gofmt >/dev/null 2>&1 && gofmt -w "$filepath" 2>/dev/null || true
    ;;
  *.rs)
    command -v rustfmt >/dev/null 2>&1 && rustfmt "$filepath" 2>/dev/null || true
    ;;
  *.py)
    command -v ruff >/dev/null 2>&1 && ruff format "$filepath" 2>/dev/null || true
    ;;
  *.ts|*.tsx|*.js|*.jsx)
    if command -v prettier >/dev/null 2>&1; then
      prettier --write "$filepath" 2>/dev/null || true
    fi
    ;;
esac

echo '{}'
exit 0

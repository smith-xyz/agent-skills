#!/usr/bin/env bash
# Go-specific stop hook: go vet → golangci-lint → test
set -euo pipefail

input=$(cat)
workspace="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$workspace"

git diff --quiet HEAD -- '*.go' 2>/dev/null && { echo '{}'; exit 0; }

errors=""

if ! go vet ./... 2>/tmp/verify-vet.txt; then
  errors+="[go vet] $(tail -20 /tmp/verify-vet.txt)"$'\n\n'
fi

if [[ -z "$errors" ]] && command -v golangci-lint >/dev/null 2>&1; then
  if ! golangci-lint run ./... 2>/tmp/verify-lint.txt; then
    errors+="[golangci-lint] $(tail -20 /tmp/verify-lint.txt)"$'\n\n'
  fi
fi

if [[ -z "$errors" ]]; then
  if ! go test ./... -count=1 -short 2>/tmp/verify-test.txt; then
    errors+="[go test] $(tail -30 /tmp/verify-test.txt)"$'\n\n'
  fi
fi

if [[ -n "$errors" ]]; then
  trimmed="${errors:0:3000}"
  jq -n --arg msg "Post-turn verification failed. Fix before continuing:

$trimmed" '{followup_message: $msg}'
  exit 0
fi

echo '{}'

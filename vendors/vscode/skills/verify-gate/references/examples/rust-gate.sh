#!/usr/bin/env bash
# Rust-specific stop hook: cargo check → clippy → test
set -euo pipefail

input=$(cat)
workspace="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$workspace"

git diff --quiet HEAD -- '*.rs' 2>/dev/null && { echo '{}'; exit 0; }

errors=""

if ! cargo check 2>/tmp/verify-check.txt; then
  errors+="[cargo check] $(tail -20 /tmp/verify-check.txt)"$'\n\n'
fi

if [[ -z "$errors" ]]; then
  if ! cargo clippy -- -D warnings 2>/tmp/verify-clippy.txt 1>/dev/null; then
    errors+="[clippy] $(tail -20 /tmp/verify-clippy.txt)"$'\n\n'
  fi
fi

if [[ -z "$errors" ]]; then
  if ! cargo test 2>/tmp/verify-test.txt 1>/dev/null; then
    failures=$(grep -A5 "FAILED\|panicked\|assertion" /tmp/verify-test.txt | head -40)
    errors+="[cargo test] $failures"$'\n\n'
  fi
fi

if [[ -n "$errors" ]]; then
  trimmed="${errors:0:3000}"
  jq -n --arg msg "Post-turn verification failed. Fix before continuing:

$trimmed" '{followup_message: $msg}'
  exit 0
fi

echo '{}'

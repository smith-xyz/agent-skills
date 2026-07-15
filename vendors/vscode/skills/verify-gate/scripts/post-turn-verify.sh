#!/usr/bin/env bash
# Generic stop hook: detect changed files by extension, run tiered checks.
# Feeds failures back as followup_message. Returns '{}' on success.
#
# Configure via VERIFY_GATE_CHECKS env var (JSON) or edit the detect_and_check function.
# Default: auto-detect language from changed file extensions.
set -euo pipefail

input=$(cat)
workspace="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$workspace"

changed_exts() {
  git diff --name-only HEAD 2>/dev/null | sed 's/.*\.//' | sort -u
}

run_check() {
  local label="$1" cmd="$2"
  local output
  output=$(eval "$cmd" 2>&1) || {
    echo "[$label] $(echo "$output" | tail -30)"
    return 1
  }
  return 0
}

errors=""

detect_and_check() {
  local exts
  exts=$(changed_exts)

  [[ -z "$exts" ]] && return 0

  # Rust
  if echo "$exts" | grep -qw rs; then
    errors+=$(run_check "cargo check" "cargo check 2>&1" || true)
    [[ -z "$errors" ]] && errors+=$(run_check "clippy" "cargo clippy -- -D warnings 2>&1" || true)
    [[ -z "$errors" ]] && errors+=$(run_check "cargo test" "cargo test 2>&1" || true)
  fi

  # Go
  if echo "$exts" | grep -qw go; then
    errors+=$(run_check "go vet" "go vet ./... 2>&1" || true)
    [[ -z "$errors" ]] && errors+=$(run_check "go test" "go test ./... -count=1 -short 2>&1" || true)
  fi

  # TypeScript / JavaScript
  if echo "$exts" | grep -qwE 'ts|tsx|js|jsx'; then
    if [[ -f "tsconfig.json" ]]; then
      if command -v pnpm >/dev/null 2>&1 && [[ -f "pnpm-lock.yaml" ]]; then
        errors+=$(run_check "typecheck" "pnpm tsc --noEmit 2>&1" || true)
      elif command -v bun >/dev/null 2>&1 && [[ -f "bun.lock" || -f "bun.lockb" ]]; then
        errors+=$(run_check "typecheck" "bun run tsc --noEmit 2>&1" || true)
      elif command -v npx >/dev/null 2>&1; then
        errors+=$(run_check "typecheck" "npx tsc --noEmit 2>&1" || true)
      fi
    fi
  fi

  # Python
  if echo "$exts" | grep -qw py; then
    if command -v ruff >/dev/null 2>&1; then
      errors+=$(run_check "ruff check" "ruff check . 2>&1" || true)
    fi
    if command -v mypy >/dev/null 2>&1 && [[ -f "pyproject.toml" || -f "mypy.ini" ]]; then
      errors+=$(run_check "mypy" "mypy . 2>&1" || true)
    fi
  fi
}

detect_and_check

if [[ -n "$errors" ]]; then
  trimmed="${errors:0:3000}"
  followup=$(jq -n --arg msg "Post-turn verification failed. Fix before continuing:

$trimmed" '{followup_message: $msg}')
  echo "$followup"
  exit 0
fi

echo '{}'
exit 0

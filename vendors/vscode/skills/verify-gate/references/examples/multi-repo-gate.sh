#!/usr/bin/env bash
# Multi-repo stop hook: detect which subdirectory repos changed, run appropriate checks.
# Adapted from caseboard pattern — works for monorepos with multiple stacks.
set -euo pipefail

input=$(cat)
workspace="$(pwd)"
errors=""

check_repo() {
  local repo="$1" cmd="$2" label="$3"
  local dir="$workspace/$repo"
  [[ -d "$dir" ]] || return 0

  if ! git -C "$dir" diff --quiet HEAD 2>/dev/null; then
    output=$(cd "$dir" && eval "$cmd" 2>&1) || {
      errors+="[$label] $output"$'\n\n'
    }
  fi
}

# Configure per-repo checks below. Add/remove entries for your project.
# check_repo "<dir>" "<check command>" "<label>"

# Example: Go API + TypeScript UI + Bun service
# check_repo "api"     "go vet ./... 2>&1 && go test ./... -count=1 -short 2>&1"  "api: vet+test"
# check_repo "ui"      "pnpm typecheck 2>&1 && pnpm lint 2>&1"                     "ui: typecheck+lint"
# check_repo "service" "bun run typecheck 2>&1"                                     "service: typecheck"

if [[ -n "$errors" ]]; then
  trimmed="${errors:0:3000}"
  jq -n --arg msg "Post-turn verification failed. Fix before continuing:

$trimmed" '{followup_message: $msg}'
  exit 0
fi

echo '{}'

#!/usr/bin/env bash
# TypeScript-specific stop hook: tsc → eslint → test
set -euo pipefail

input=$(cat)
workspace="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$workspace"

git diff --quiet HEAD -- '*.ts' '*.tsx' 2>/dev/null && { echo '{}'; exit 0; }

errors=""
PKG_MGR="npx"
[[ -f "pnpm-lock.yaml" ]] && PKG_MGR="pnpm"
[[ -f "bun.lock" || -f "bun.lockb" ]] && PKG_MGR="bun run"

if [[ -f "tsconfig.json" ]]; then
  if ! $PKG_MGR tsc --noEmit 2>/tmp/verify-tsc.txt; then
    errors+="[typecheck] $(tail -20 /tmp/verify-tsc.txt)"$'\n\n'
  fi
fi

if [[ -z "$errors" ]]; then
  if command -v eslint >/dev/null 2>&1 || [[ -f ".eslintrc" || -f ".eslintrc.js" || -f ".eslintrc.json" || -f "eslint.config.js" || -f "eslint.config.mjs" ]]; then
    if ! $PKG_MGR eslint . 2>/tmp/verify-lint.txt; then
      errors+="[eslint] $(tail -20 /tmp/verify-lint.txt)"$'\n\n'
    fi
  fi
fi

if [[ -z "$errors" ]]; then
  if [[ -f "vitest.config.ts" || -f "vitest.config.js" ]]; then
    $PKG_MGR vitest run 2>/tmp/verify-test.txt 1>/dev/null || {
      errors+="[vitest] $(tail -30 /tmp/verify-test.txt)"$'\n\n'
    }
  elif [[ -f "jest.config.ts" || -f "jest.config.js" ]]; then
    $PKG_MGR jest --ci 2>/tmp/verify-test.txt 1>/dev/null || {
      errors+="[jest] $(tail -30 /tmp/verify-test.txt)"$'\n\n'
    }
  fi
fi

if [[ -n "$errors" ]]; then
  trimmed="${errors:0:3000}"
  jq -n --arg msg "Post-turn verification failed. Fix before continuing:

$trimmed" '{followup_message: $msg}'
  exit 0
fi

echo '{}'

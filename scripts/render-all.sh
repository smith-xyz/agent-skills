#!/usr/bin/env bash
# Render shared/ agents and skills into vendors/<vendor>/ for each active vendor.
# Run via: make render
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHARED="$REPO_ROOT/shared"
VENDORS="$REPO_ROOT/vendors"
RENDER_AGENT="$REPO_ROOT/scripts/render-agent.sh"

ACTIVE_VENDORS=(cursor claude codex vscode)

for vendor in "${ACTIVE_VENDORS[@]}"; do
  echo "--- Rendering $vendor ---"
  target="$VENDORS/$vendor"

  # Agents
  if [ -d "$SHARED/agents" ]; then
    mkdir -p "$target/agents"
    for f in "$SHARED/agents/"*.md; do
      [ -e "$f" ] || continue
      [[ "$(basename "$f")" == "README.md" ]] && continue
      base=$(basename "$f")
      if [[ "$vendor" == "codex" ]]; then
        "$RENDER_AGENT" --vendor "$vendor" --source "$f" --dest "$target/agents/${base%.md}.toml"
      else
        "$RENDER_AGENT" --vendor "$vendor" --source "$f" --dest "$target/agents/$base"
      fi
    done
    count=$(ls -1 "$target/agents/" 2>/dev/null | wc -l | tr -d ' ')
    echo "  agents: $count rendered"
  fi

  # Skills — straight copy (no transformation needed)
  if [ -d "$SHARED/skills" ]; then
    mkdir -p "$target/skills"
    for src in "$SHARED/skills/"*/; do
      [ -d "$src" ] || continue
      name=$(basename "$src")
      rm -rf "$target/skills/$name"
      cp -R "${src%/}" "$target/skills/$name"
    done
    count=$(ls -1d "$target/skills/"*/ 2>/dev/null | wc -l | tr -d ' ')
    echo "  skills: $count rendered"
  fi
done

echo ""
echo "Done. Commit vendors/ changes, then 'make install-<vendor>' to deploy."

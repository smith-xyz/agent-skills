#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WS_ROOT="$(cd "$SCRIPT_DIR/../../../../.." && pwd)"
SHARED_SKILLS_DIR="$SCRIPT_DIR/../../skills"
EXT_DIR="$SCRIPT_DIR/../../../vendors/vscode/extensions/artifact-viewer"

echo "=== artifact-emit bootstrap ==="
echo "  workspace: $WS_ROOT"
echo ""

echo "→ Building artifact-emit..."
cd "$SCRIPT_DIR"
bun install
bun run build

echo ""
echo "→ Symlinking binary to PATH..."
mkdir -p ~/.local/bin
ln -sf "$SCRIPT_DIR/artifact" ~/.local/bin/artifact
echo "  ~/.local/bin/artifact → $SCRIPT_DIR/artifact"

echo ""
echo "→ Initializing artifact DB..."
artifact init-db --db "$WS_ROOT/.cursor/artifacts.db"

echo ""
echo "→ Building + installing extension..."
cd "$EXT_DIR"
npm ci
npm run install-ext

echo ""
echo "→ Syncing global portable skills..."
PORTABLE_SKILLS=(go-patterns python-patterns rust-patterns typescript-patterns react-patterns coding-practice commit-prep sniff-bugs arxiv-ai-scan)
mkdir -p ~/.cursor/skills
for skill in "${PORTABLE_SKILLS[@]}"; do
  ln -sf "$SHARED_SKILLS_DIR/$skill" "$HOME/.cursor/skills/$skill"
done
echo "  ${#PORTABLE_SKILLS[@]} skills symlinked to ~/.cursor/skills/"

echo ""
echo "→ Running discover-agents.sh..."
bash "$WS_ROOT/.cursor/discover-agents.sh"

echo ""
echo "=== bootstrap complete ==="
echo "  artifact binary: ~/.local/bin/artifact"
echo "  artifact DB:     $WS_ROOT/.cursor/artifacts.db"
echo "  extension:       installed"
echo "  skills:          ${#PORTABLE_SKILLS[@]} synced"

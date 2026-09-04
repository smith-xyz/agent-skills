#!/usr/bin/env bash
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/install-lib.sh"

VENDOR="cursor"
ACTION="install"
TARGET=""

usage() {
  cat <<EOF
Usage: $0 [install|remove] [--target /path/to/.cursor]

  install              Install to ~/.cursor (copy mode)
  install --target DIR Install to DIR (symlink mode; skips vendor JSON)
  remove [--target DIR] Remove installed assets
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    install|remove) ACTION="$1"; shift ;;
    --target)
      TARGET="${2:?--target requires a path}"
      shift 2
      ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

if [ -n "$TARGET" ]; then
  INSTALL_HOME="$(cd "$(dirname "$TARGET")" && pwd)/$(basename "$TARGET")"
  mkdir -p "$INSTALL_HOME"
  INSTALL_MODE="link"
  export INSTALL_HOME INSTALL_MODE
fi

CURSOR_HOME="$(vendor_home "$VENDOR")"

install_vendor_files() {
  # Global-only — permissions/cli-config stay in ~/.cursor
  if [ -n "${INSTALL_HOME:-}" ]; then
    echo "  vendor files: skipped (workspace target)"
    return
  fi
  local src="$VENDORS/cursor"
  for f in "$src"/*.json; do
    [ -e "$f" ] || continue
    cp "$f" "$CURSOR_HOME/"
    echo "  $(basename "$f") → $CURSOR_HOME/"
  done
}

remove_vendor_files() {
  if [ -n "${INSTALL_HOME:-}" ]; then
    return
  fi
  local src="$VENDORS/cursor"
  for f in "$src"/*.json; do
    [ -e "$f" ] || continue
    local dest="$CURSOR_HOME/$(basename "$f")"
    [ -f "$dest" ] && rm -f "$dest" && echo "  removed $(basename "$f")"
  done
}

case "$ACTION" in
  install)
    echo "--- Installing to $VENDOR ($CURSOR_HOME, mode=$INSTALL_MODE) ---"
    install_skills "$VENDOR"
    install_agents "$VENDOR"
    install_rules "$VENDOR"
    install_hooks "$VENDOR"
    install_vendor_files
    cleanup_stale "$VENDOR"
    show_installed "$VENDOR"
    ;;
  remove)
    echo "--- Removing from $VENDOR ($CURSOR_HOME) ---"
    remove_skills "$VENDOR"
    remove_agents "$VENDOR"
    remove_rules "$VENDOR"
    remove_hooks "$VENDOR"
    remove_vendor_files
    ;;
esac

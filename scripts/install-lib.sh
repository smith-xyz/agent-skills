#!/usr/bin/env bash
# Shared functions for vendor install scripts.
# Source this — don't execute directly.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHARED="$REPO_ROOT/shared"
VENDORS="$REPO_ROOT/vendors"

# Defaults — overridden by --target / INSTALL_HOME / INSTALL_MODE
INSTALL_MODE="${INSTALL_MODE:-copy}"   # copy | link
INSTALL_HOME="${INSTALL_HOME:-}"       # empty → vendor_home()

STALE_SKILLS=(
  project-scaffold prose-refine fact-check multi-review
  adversarial-review reproduce-issue find-issues jira
  credentials gh-project-workflow pqc-readiness brainstorm
  qodo-review
)

vendor_home() {
  if [ -n "$INSTALL_HOME" ]; then
    echo "$INSTALL_HOME"
  else
    echo "$HOME/.$1"
  fi
}

_install_item() {
  # _install_item <src> <dest>
  local src=$1 dest=$2
  mkdir -p "$(dirname "$dest")"
  if [ "$INSTALL_MODE" = "link" ]; then
    ln -sfn "$src" "$dest"
  else
    if [ -d "$src" ]; then
      rm -rf "$dest"
      cp -R "$src" "$dest"
    else
      cp "$src" "$dest"
    fi
  fi
}

# --- Skills ---

install_skills() {
  local vendor=$1
  local target src_dir
  target="$(vendor_home "$vendor")/skills"
  src_dir="$VENDORS/$vendor/skills"
  # Fall back to shared/ if vendor skills not rendered (skills need no transformation)
  if [ ! -d "$src_dir" ]; then
    src_dir="$SHARED/skills"
  fi
  [ -d "$src_dir" ] || return
  mkdir -p "$target"
  for src in "$src_dir/"*/; do
    [ -d "$src" ] || continue
    local name
    name=$(basename "$src")
    if [ "$INSTALL_MODE" = "link" ] && [ -e "$target/$name" ] && [ ! -L "$target/$name" ]; then
      echo "  SKIP native: $name"
      continue
    fi
    _install_item "${src%/}" "$target/$name"
  done
  echo "  skills → $target ($INSTALL_MODE)"
}

remove_skills() {
  local vendor=$1
  local target
  target="$(vendor_home "$vendor")/skills"
  for src in "$SHARED/skills/"*/; do
    [ -d "$src" ] || continue
    local name
    name=$(basename "$src")
    local dest="$target/$name"
    if [ -L "$dest" ] || [ -d "$dest" ]; then
      rm -rf "$dest" && echo "  removed skill: $name"
    fi
  done
}

# --- Agents ---

install_agents() {
  local vendor=$1
  local target src_dir
  target="$(vendor_home "$vendor")/agents"
  src_dir="$VENDORS/$vendor/agents"
  [ -d "$src_dir" ] || { echo "  agents: run 'make render' first"; return 1; }
  mkdir -p "$target"
  for f in "$src_dir/"*; do
    [ -e "$f" ] || continue
    local base
    base=$(basename "$f")
    if [ "$INSTALL_MODE" = "link" ] && [ -e "$target/$base" ] && [ ! -L "$target/$base" ]; then
      echo "  SKIP native: $base"
      continue
    fi
    _install_item "$f" "$target/$base"
  done
  echo "  agents → $target ($INSTALL_MODE)"
}

remove_agents() {
  local vendor=$1
  local target
  target="$(vendor_home "$vendor")/agents"
  for src in "$SHARED/agents/"*.md; do
    [ -e "$src" ] || continue
    local base
    base=$(basename "$src")
    [[ "$base" == "README.md" ]] && continue
    [[ "$vendor" == "codex" ]] && base="${base%.md}.toml"
    local dest="$target/$base"
    if [ -L "$dest" ] || [ -f "$dest" ]; then
      rm -f "$dest" && echo "  removed agent: $base"
    fi
  done
}

# --- Rules (vendor-specific, e.g. vendors/cursor/rules/*.mdc) ---

install_rules() {
  local vendor=$1
  local src="$VENDORS/$vendor/rules"
  local target
  target="$(vendor_home "$vendor")/rules"
  [ -d "$src" ] || return
  mkdir -p "$target"
  for f in "$src/"*; do
    [ -e "$f" ] || continue
    local base
    base=$(basename "$f")
    if [ "$INSTALL_MODE" = "link" ] && [ -e "$target/$base" ] && [ ! -L "$target/$base" ]; then
      echo "  SKIP native: $base"
      continue
    fi
    _install_item "$f" "$target/$base"
  done
  echo "  rules → $target ($INSTALL_MODE)"
}

remove_rules() {
  local vendor=$1
  local src="$VENDORS/$vendor/rules"
  local target
  target="$(vendor_home "$vendor")/rules"
  [ -d "$src" ] || return
  for f in "$src/"*; do
    [ -e "$f" ] || continue
    local dest="$target/$(basename "$f")"
    if [ -L "$dest" ] || [ -f "$dest" ]; then
      rm -f "$dest" && echo "  removed rule: $(basename "$f")"
    fi
  done
}

# --- Hooks ---

install_hooks() {
  local vendor=$1
  local target
  target="$(vendor_home "$vendor")/hooks"
  [ -d "$SHARED/hooks" ] || return
  mkdir -p "$target"
  for f in "$SHARED/hooks/"*.sh; do
    [ -e "$f" ] || continue
    local base
    base=$(basename "$f")
    if [ "$INSTALL_MODE" = "link" ] && [ -e "$target/$base" ] && [ ! -L "$target/$base" ]; then
      echo "  SKIP native: $base"
      continue
    fi
    _install_item "$f" "$target/$base"
    chmod +x "$target/$base" 2>/dev/null || true
  done
  echo "  hooks → $target ($INSTALL_MODE)"
}

remove_hooks() {
  local vendor=$1
  local target
  target="$(vendor_home "$vendor")/hooks"
  for src in "$SHARED/hooks/"*.sh; do
    [ -e "$src" ] || continue
    local f="$target/$(basename "$src")"
    if [ -L "$f" ] || [ -f "$f" ]; then
      rm -f "$f" && echo "  removed hook: $(basename "$src")"
    fi
  done
}

# --- Scheduling (OS-level, cross-vendor; always global) ---

install_scheduling() {
  if [ -n "$INSTALL_HOME" ]; then
    echo "  scheduling: skipped (workspace target)"
    return
  fi
  local target="$HOME/.agent-skills/scheduling"
  [ -d "$SHARED/scheduling" ] || return
  mkdir -p "$target"
  cp -r "$SHARED/scheduling/"* "$target/" 2>/dev/null || true
  chmod +x "$target/install-schedules.sh" 2>/dev/null || true
  echo "  scheduling → $target"
}

# --- Stale cleanup ---

cleanup_stale() {
  local vendor=$1
  for skill in "${STALE_SKILLS[@]}"; do
    local dir
    dir="$(vendor_home "$vendor")/skills/$skill"
    if [ -e "$dir" ]; then
      rm -rf "$dir"
      echo "  cleaned stale: $skill"
    fi
  done
  # Also remove broken symlinks in skills/agents/rules
  local home
  home=$(vendor_home "$vendor")
  for dir in skills agents rules hooks; do
    [ -d "$home/$dir" ] || continue
    find "$home/$dir" -maxdepth 1 -type l ! -exec test -e {} \; -print -delete 2>/dev/null | while read -r broken; do
      echo "  cleaned broken link: $(basename "$broken")"
    done
  done
}

# --- Summary ---

show_installed() {
  local vendor=$1
  local home
  home=$(vendor_home "$vendor")
  echo ""
  echo "[$vendor] home=$home mode=$INSTALL_MODE"
  for dir in skills agents hooks; do
    local count
    count=$(ls -1 "$home/$dir" 2>/dev/null | wc -l | tr -d ' ')
    echo "  $dir: $count items"
  done
  local rc
  rc=$(ls -1 "$home/rules" 2>/dev/null | wc -l | tr -d ' ')
  echo "  rules: $rc items"
}

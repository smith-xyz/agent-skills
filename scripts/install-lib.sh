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
  qodo-review artifact-ingest triage morning-briefing
)

vendor_home() {
  if [ -n "$INSTALL_HOME" ]; then
    echo "$INSTALL_HOME"
    return
  fi
  case "$1" in
    # VS Code Copilot reads personal customizations from ~/.copilot, not
    # ~/.vscode (which holds extensions and CLI state).
    vscode)   echo "$HOME/.copilot" ;;
    # OpenCode uses XDG-style config at ~/.config/opencode.
    opencode) echo "$HOME/.config/opencode" ;;
    # Pi's user home is ~/.pi/agent (skills, agents, AGENTS.md, settings all
    # live under the agent/ subdir, not ~/.pi directly).
    pi)       echo "$HOME/.pi/agent" ;;
    *)        echo "$HOME/.$1" ;;
  esac
}

# True when installing to an explicit --target/INSTALL_HOME rather than the
# real vendor home. Global vendor config (settings.json, MCP, execpolicy) must
# never be written in that case.
is_workspace_target() {
  [ -n "$INSTALL_HOME" ]
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
  src_dir="$SHARED/skills"
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

agents_target() {
  echo "$(vendor_home "$1")/agents"
}

# Vendor-specific filename for a rendered agent. VS Code only recognizes user
# agents with the .agent.md suffix; Codex wants TOML.
agent_basename() {
  local vendor=$1 base=$2
  case "$vendor" in
    codex)  echo "${base%.md}.toml" ;;
    vscode) echo "${base%.md}.agent.md" ;;
    # Pi agents are plain <name>.md markdown files.
    pi)     echo "$base" ;;
    *)      echo "$base" ;;
  esac
}

install_agents() {
  local vendor=$1
  local target
  target="$(agents_target "$vendor")"
  [ -d "$SHARED/agents" ] || return 0
  mkdir -p "$target"
  local count=0
  for f in "$SHARED/agents/"*.md; do
    [ -e "$f" ] || continue
    local base
    base=$(basename "$f")
    [[ "$base" == "README.md" ]] && continue
    base=$(agent_basename "$vendor" "$base")
    if [ -e "$target/$base" ] && [ ! -L "$target/$base" ] && [ "$INSTALL_MODE" = "link" ]; then
      echo "  SKIP native: $base"
      continue
    fi
    "$REPO_ROOT/scripts/render-agent.sh" --vendor "$vendor" --source "$f" --dest "$target/$base"
    count=$((count + 1))
  done
  echo "  agents → $target ($count rendered)"
}

remove_agents() {
  local vendor=$1
  local target
  target="$(agents_target "$vendor")"
  for src in "$SHARED/agents/"*.md; do
    [ -e "$src" ] || continue
    local base
    base=$(basename "$src")
    [[ "$base" == "README.md" ]] && continue
    base=$(agent_basename "$vendor" "$base")
    local dest="$target/$base"
    if [ -L "$dest" ] || [ -f "$dest" ]; then
      rm -f "$dest" && echo "  removed agent: $base"
    fi
  done
}

# --- Rules (canonical source: shared/rules/*.mdc, rendered per vendor) ---

# Where a vendor expects its global rules to land.
rules_target() {
  case "$1" in
    cursor)   echo "$(vendor_home cursor)/rules" ;;
    claude)   echo "$(vendor_home claude)/CLAUDE.md" ;;
    codex)    echo "$(vendor_home codex)/AGENTS.md" ;;
    opencode) echo "$(vendor_home opencode)/AGENTS.md" ;;
    vscode)   echo "$(vendor_home vscode)/instructions" ;;
    pi)       echo "$(vendor_home pi)/AGENTS.md" ;;
    *)        echo "" ;;
  esac
}

# Vendors whose rules_target is a directory of per-rule files rather than one
# concatenated file.
rules_target_is_dir() {
  [[ "$1" == "cursor" || "$1" == "vscode" ]]
}

install_rules() {
  local vendor=$1
  local target
  target="$(rules_target "$vendor")"
  [ -n "$target" ] || return 0
  [ -d "$SHARED/rules" ] || return 0

  # Cursor takes .mdc files verbatim; every other vendor gets a single
  # concatenated file with frontmatter stripped.
  "$REPO_ROOT/scripts/render-rules.sh" "$vendor" --dest "$target" >/dev/null
  echo "  rules → $target"
}

remove_rules() {
  local vendor=$1
  local target
  target="$(rules_target "$vendor")"
  [ -n "$target" ] || return 0

  if rules_target_is_dir "$vendor"; then
    local suffix=".mdc"
    [ "$vendor" = "vscode" ] && suffix=".instructions.md"
    for f in "$SHARED/rules/"*.mdc; do
      [ -e "$f" ] || continue
      local name
      name="$(basename "$f" .mdc)$suffix"
      local dest="$target/$name"
      if [ -L "$dest" ] || [ -f "$dest" ]; then
        rm -f "$dest" && echo "  removed rule: $name"
      fi
    done
  elif [ -f "$target" ]; then
    rm -f "$target" && echo "  removed rules: $target"
  fi
  return 0
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

# --- Extensions (pi-specific: TypeScript extensions replacing shell hooks) ---

install_extensions() {
  local vendor=$1
  local src_dir="$REPO_ROOT/vendors/$vendor/extensions"
  local target
  target="$(vendor_home "$vendor")/extensions"
  [ -d "$src_dir" ] || return
  mkdir -p "$target"
  for f in "$src_dir/"*.ts; do
    [ -e "$f" ] || continue
    local base
    base=$(basename "$f")
    if [ "$INSTALL_MODE" = "link" ] && [ -e "$target/$base" ] && [ ! -L "$target/$base" ]; then
      echo "  SKIP native: $base"
      continue
    fi
    _install_item "$f" "$target/$base"
  done
  echo "  extensions → $target ($INSTALL_MODE)"
}

remove_extensions() {
  local vendor=$1
  local src_dir="$REPO_ROOT/vendors/$vendor/extensions"
  local target
  target="$(vendor_home "$vendor")/extensions"
  for src in "$src_dir/"*.ts; do
    [ -e "$src" ] || continue
    local f="$target/$(basename "$src")"
    if [ -L "$f" ] || [ -f "$f" ]; then
      rm -f "$f" && echo "  removed extension: $(basename "$src")"
    fi
  done
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
  for dir in skills agents rules hooks extensions; do
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
  for dir in skills agents hooks extensions lib; do
    local count=0
    [ -d "$home/$dir" ] && count=$(ls -1 "$home/$dir" | wc -l | tr -d ' ')
    echo "  $dir: $count items"
  done
  local rc=0
  [ -d "$home/rules" ] && rc=$(ls -1 "$home/rules" | wc -l | tr -d ' ')
  echo "  rules: $rc items"
}

#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_DIR="$(cd "$SCRIPT_DIR/../skills" && pwd)"
SKILL_PATH="$SKILLS_DIR/morning-briefing"
LOG_DIR="$HOME/.developer/morning-briefing"
PLIST_NAME="com.user.morning-briefing"
LAUNCH_AGENTS="$HOME/Library/LaunchAgents"

usage() {
  echo "Usage: $0 <install|uninstall|status>"
  echo
  echo "  install    Install scheduling (launchd on macOS, crontab on Linux)"
  echo "  uninstall  Remove scheduling"
  echo "  status     Show whether scheduled and last run"
  exit 1
}

install_launchd() {
  local src="$SCRIPT_DIR/launchd/${PLIST_NAME}.plist"
  local dest="$LAUNCH_AGENTS/${PLIST_NAME}.plist"

  mkdir -p "$LAUNCH_AGENTS" "$LOG_DIR"

  sed -e "s|__SKILL_PATH__|${SKILL_PATH}|g" \
      -e "s|__LOG_DIR__|${LOG_DIR}|g" \
      "$src" > "$dest"

  launchctl unload "$dest" 2>/dev/null || true
  launchctl load "$dest"
  echo "Installed: $dest"
  echo "Runs weekdays at 07:00. Logs: $LOG_DIR/"
}

uninstall_launchd() {
  local dest="$LAUNCH_AGENTS/${PLIST_NAME}.plist"
  if [[ -f "$dest" ]]; then
    launchctl unload "$dest" 2>/dev/null || true
    rm -f "$dest"
    echo "Uninstalled: $dest"
  else
    echo "Not installed."
  fi
}

status_launchd() {
  if launchctl list | grep -q "$PLIST_NAME"; then
    echo "Status: LOADED"
    launchctl list "$PLIST_NAME" 2>/dev/null || true
  else
    echo "Status: NOT LOADED"
  fi
  echo
  local state="$HOME/.agent-skills/state/morning-briefing/last-run.iso"
  if [[ -f "$state" ]]; then
    echo "Last run: $(cat "$state")"
  else
    echo "Last run: never"
  fi
}

install_crontab() {
  local src="$SCRIPT_DIR/crontab/morning-briefing.crontab"
  mkdir -p "$LOG_DIR"

  local entry
  entry=$(sed -e "s|__SKILL_PATH__|${SKILL_PATH}|g" \
              -e "s|__LOG_DIR__|${LOG_DIR}|g" \
              "$src" | grep -v '^#')

  if crontab -l 2>/dev/null | grep -qF "morning-briefing.sh"; then
    echo "Already installed in crontab."
    return
  fi

  (crontab -l 2>/dev/null; echo "$entry") | crontab -
  echo "Installed crontab entry. Logs: $LOG_DIR/"
}

uninstall_crontab() {
  if crontab -l 2>/dev/null | grep -qF "morning-briefing.sh"; then
    crontab -l | grep -vF "morning-briefing.sh" | crontab -
    echo "Removed crontab entry."
  else
    echo "Not installed in crontab."
  fi
}

status_crontab() {
  if crontab -l 2>/dev/null | grep -qF "morning-briefing.sh"; then
    echo "Status: INSTALLED"
    crontab -l | grep "morning-briefing"
  else
    echo "Status: NOT INSTALLED"
  fi
  echo
  local state="$HOME/.agent-skills/state/morning-briefing/last-run.iso"
  if [[ -f "$state" ]]; then
    echo "Last run: $(cat "$state")"
  else
    echo "Last run: never"
  fi
}

ACTION="${1:-}"
[[ -z "$ACTION" ]] && usage

case "$(uname -s)" in
  Darwin)
    case "$ACTION" in
      install)   install_launchd ;;
      uninstall) uninstall_launchd ;;
      status)    status_launchd ;;
      *)         usage ;;
    esac
    ;;
  Linux)
    case "$ACTION" in
      install)   install_crontab ;;
      uninstall) uninstall_crontab ;;
      status)    status_crontab ;;
      *)         usage ;;
    esac
    ;;
  *)
    echo "Unsupported OS: $(uname -s)" >&2
    exit 1
    ;;
esac

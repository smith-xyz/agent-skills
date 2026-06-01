#!/usr/bin/env bash
set -euo pipefail

BASE="${CODING_PRACTICE_HOME:-$HOME/.coding-practice}"

usage() {
  cat <<EOF
Usage: $(basename "$0") <action> [options]

Actions:
  session_paths    Return deterministic session paths (mkdir only for real/--multi)
  list_sessions    List entries under sessions dir

session_paths:
  --language LANG       rust | go | typescript | python (required)
  --difficulty LEVEL    easy | intermediate | hard | real (required)
  --multi               Folder layout for non-real difficulties

Outputs JSON paths. User creates files.
EOF
  exit 0
}

ext_for() {
  case "$1" in
    rust) echo rs ;;
    go) echo go ;;
    python) echo py ;;
    typescript) echo ts ;;
    *) echo "Error: unknown language $1" >&2; exit 1 ;;
  esac
}

test_name() {
  local base=$1 lang=$2
  case "$lang" in
    go) echo "${base}_test" ;;
    *) echo "${base}-test" ;;
  esac
}

session_paths() {
  local lang="" difficulty="" multi=false
  while [[ $# -gt 0 ]]; do
    case $1 in
      --language) lang="$2"; shift 2 ;;
      --difficulty) difficulty="$2"; shift 2 ;;
      --multi) multi=true; shift ;;
      *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
  done

  [[ -n "$lang" && -n "$difficulty" ]] || {
    echo "Error: --language and --difficulty required" >&2; exit 1
  }
  case "$difficulty" in easy|intermediate|hard|real) ;; *)
    echo "Error: difficulty must be easy|intermediate|hard|real" >&2; exit 1 ;;
  esac
  case "$lang" in rust|go|python|typescript) ;; *)
    echo "Error: language must be rust|go|python|typescript" >&2; exit 1 ;;
  esac

  local ext ts base sessions_dir
  ext=$(ext_for "$lang")
  ts=$(date +%Y-%m-%dT%H%M%S)
  sessions_dir="$BASE/$lang/sessions"
  mkdir -p "$sessions_dir"

  if [[ "$difficulty" == "real" ]]; then
    base="${ts}-real"
    local dir="$sessions_dir/$base"
    mkdir -p "$dir"
    jq -n \
      --arg lang "$lang" --arg difficulty "$difficulty" --arg ts "$ts" \
      --arg dir "$dir" --arg base "$base" --arg ext "$ext" \
      --arg readme "$dir/README.md" \
      --arg main "$dir/${base}.${ext}" \
      --arg test "$dir/$(test_name "$base" "$lang").${ext}" \
      '{language: $lang, difficulty: $difficulty, timestamp: $ts, workdir: $dir, readme: $readme, main: $main, test: $test}'
  elif [[ "$multi" == true ]]; then
    base="${ts}-${difficulty}"
    local dir="$sessions_dir/$base"
    mkdir -p "$dir"
    jq -n \
      --arg lang "$lang" --arg difficulty "$difficulty" --arg ts "$ts" \
      --arg dir "$dir" --arg base "$base" --arg ext "$ext" \
      --arg main "$dir/${base}.${ext}" \
      --arg test "$dir/$(test_name "$base" "$lang").${ext}" \
      '{language: $lang, difficulty: $difficulty, timestamp: $ts, workdir: $dir, main: $main, test: $test}'
  else
    base="${ts}-${difficulty}"
    jq -n \
      --arg lang "$lang" --arg difficulty "$difficulty" --arg ts "$ts" \
      --arg sessions_dir "$sessions_dir" --arg base "$base" --arg ext "$ext" \
      --arg main "$sessions_dir/${base}.${ext}" \
      --arg test "$sessions_dir/$(test_name "$base" "$lang").${ext}" \
      '{language: $lang, difficulty: $difficulty, timestamp: $ts, sessions_dir: $sessions_dir, main: $main, test: $test}'
  fi
}

list_sessions() {
  local lang=""
  while [[ $# -gt 0 ]]; do
    case $1 in
      --language) lang="$2"; shift 2 ;;
      *) echo "Unknown option: $1" >&2; exit 1 ;;
    esac
  done
  [[ -n "$lang" ]] || { echo "Error: --language required" >&2; exit 1; }

  local sessions_dir="$BASE/$lang/sessions"
  [[ -d "$sessions_dir" ]] || mkdir -p "$sessions_dir"

  jq -n --arg lang "$lang" --arg dir "$sessions_dir" \
    --argjson items "$(ls -1 "$sessions_dir" 2>/dev/null | jq -R . | jq -s '.')" \
    '{language: $lang, sessions_dir: $dir, items: $items}'
}

ACTION="${1:-}"
shift || true

case "$ACTION" in
  session_paths) session_paths "$@" ;;
  list_sessions) list_sessions "$@" ;;
  -h|--help|"") usage ;;
  *) echo "Unknown action: $ACTION" >&2; usage ;;
esac

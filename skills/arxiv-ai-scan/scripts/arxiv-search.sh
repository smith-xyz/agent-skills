#!/usr/bin/env bash
# Wrapper: run arXiv search from skill dir (network required).
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec python3 "$SCRIPT_DIR/arxiv-search.py" "$@"

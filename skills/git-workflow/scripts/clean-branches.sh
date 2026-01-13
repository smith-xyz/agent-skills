#!/bin/bash
set -e

MAIN_BRANCH=${1:-main}

echo "Removing branches merged into $MAIN_BRANCH..."
git branch --merged $MAIN_BRANCH | grep -v "$MAIN_BRANCH" | xargs -r git branch -d

echo "Done."

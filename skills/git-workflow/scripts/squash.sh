#!/bin/bash
set -e

REMOTE=${1:-origin}
BRANCH=${2:-main}
MESSAGE=${3:-""}

echo "Fetching $REMOTE..."
git fetch $REMOTE

echo "Squashing commits since $REMOTE/$BRANCH..."
git reset --soft $REMOTE/$BRANCH

if [ -n "$MESSAGE" ]; then
    git commit -m "$MESSAGE"
else
    echo "Staged changes ready. Run: git commit -m \"<message>\""
fi

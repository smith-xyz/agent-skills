#!/bin/bash
set -e

REMOTE=${1:-origin}
BRANCH=${2:-main}

echo "Fetching $REMOTE..."
git fetch $REMOTE

echo "Rebasing on $REMOTE/$BRANCH..."
git rebase $REMOTE/$BRANCH

echo "Done."

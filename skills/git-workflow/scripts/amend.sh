#!/bin/bash
set -e

ALL=false
PUSH=false

for arg in "$@"; do
    case $arg in
        all) ALL=true ;;
        push) PUSH=true ;;
    esac
done

if [ "$ALL" = true ]; then
    echo "Staging all changes..."
    git add -A
fi

echo "Amending last commit..."
git commit --amend --no-edit

if [ "$PUSH" = true ]; then
    echo "Force pushing..."
    git push --force-with-lease
fi

echo "Done."

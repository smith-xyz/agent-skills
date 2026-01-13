---
name: git-workflow
description: Git workflow patterns - rebase, amend commits, sync upstreams, clean history. Use when performing git operations or when the user mentions git, commits, rebase, merge, or upstream.
---

# Git Workflow Patterns

## Actions

Execute the appropriate script based on user request. Scripts are in `scripts/` directory.

### amend

```bash
./scripts/amend.sh [all] [push]
```

- No args: amend with staged files only
- `all`: stage everything first
- `push`: force push after amend
- `all push`: both

### sync

```bash
./scripts/sync.sh [remote] [branch]
```

Defaults: `origin main`

### squash

```bash
./scripts/squash.sh [remote] [branch] [message]
```

Squashes all commits since remote/branch. If message provided, commits automatically.

### clean-branches

```bash
./scripts/clean-branches.sh [main-branch]
```

Removes local branches merged into main.

### rebase (manual)

Interactive rebase requires user input:

```bash
git fetch origin
git rebase -i origin/main
```

If conflicts: resolve files, `git add`, `git rebase --continue`

### upstream-setup (manual)

```bash
git remote add upstream <upstream-repo-url>
git fetch upstream
```

### merge-upstream (manual)

```bash
git checkout main
git fetch upstream
git merge upstream/main
git push origin main
```

### stash (manual)

```bash
git stash push -m "<description>"
git stash list
git stash pop
```

## Common Flags Reference

| Flag                 | Purpose                                            |
| -------------------- | -------------------------------------------------- |
| `--force-with-lease` | Safer force push - fails if remote has new commits |
| `--no-edit`          | Keep existing commit message when amending         |
| `-i`                 | Interactive mode for rebase                        |
| `--soft`             | Reset keeping changes staged                       |

## Workflow Patterns

### Single Commit Feature Branch

Keep one clean commit for PR:

1. Make changes, commit
2. More changes: `git add . && git commit --amend --no-edit`
3. Before PR: `git fetch origin && git rebase origin/main`
4. Push: `git push --force-with-lease`

### Fork Contribution

1. Setup: `git remote add upstream <url>`
2. Sync main: `git checkout main && git fetch upstream && git merge upstream/main`
3. Create branch: `git checkout -b feature`
4. Work, commit, push to origin
5. Create PR to upstream

## Safety Notes

- Use `--force-with-lease` instead of `--force` for safer force pushes
- Never rebase/amend commits already merged to shared branches
- `git reflog` can recover from most mistakes

---
name: coding-practice
description: Run coding-practice from .cursor/commands/coding-task. Use when user runs /coding-task or works in coding-practice/ sessions.
---

# Coding practice

Sessions live under `~/.coding-practice/<language>/` as a single file (`<timestamp>-<difficulty>.<ext>`) or a session folder with minimal files if multi-file is needed.

## When user runs /coding-task

1. Parse difficulty (`easy`|`intermediate`|`hard`|`real`) and optional language. For `real`, language can be implied.
2. Create session artifact under `~/.coding-practice/<language>/`. Create directories if needed.
3. Generate one task; output spec only. Do not implement.
4. Tell user to implement without AID, then load/paste results for review.

## When user works in a session file/folder

Give hints or clarify the spec only. Do not implement unless asked.

## When user loads/pastes their solution

Review briefly. Do not rewrite unless asked.

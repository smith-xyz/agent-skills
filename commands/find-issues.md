---
description: Find GitHub issues to contribute to in OSS projects
globs:
alwaysApply: false
---

# Find GitHub Issues for OSS Contribution

When the user asks to find issues to work on, help with OSS contributions, or similar.

**Example invocations:**

- "Find me an easy issue to work on"
- "I want a medium difficulty bug to fix"
- "Find a hard issue - I want a challenge"
- "Help me find something to contribute"

## Prerequisites

- The `gh` CLI must be installed and authenticated (`gh auth login`)
- The current directory must be a git repository with a GitHub remote

## Difficulty Levels

Ask the user what difficulty level they want, or infer from context:

| Level      | Description                                           | Common Labels                                               |
| ---------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| **easy**   | Quick wins, good for learning the codebase            | "good first issue", "easy", "beginner", "starter"           |
| **medium** | Moderate complexity, some codebase familiarity needed | "help wanted", "bug", "needs triage", "enhancement"         |
| **hard**   | Complex issues, deep knowledge required               | "complex", "performance", "architecture", "breaking change" |
| **any**    | No preference, show a mix of difficulties             | (no label filter)                                           |

Default to **medium** if the user doesn't specify.

## Workflow

1. **Detect the repository**: Run `git remote get-url origin` to determine the GitHub repository

2. **Query open issues based on difficulty**:

   For **easy**:

   ```bash
   gh issue list --state open --label "good first issue" --limit 20 --json number,title,labels,body,comments,linkedBranches,createdAt,author
   ```

   For **medium**:

   ```bash
   gh issue list --state open --limit 30 --json number,title,labels,body,comments,linkedBranches,createdAt,author
   ```

   Then filter for "bug", "help wanted", "enhancement" labels.

   For **hard**:

   ```bash
   gh issue list --state open --limit 30 --json number,title,labels,body,comments,linkedBranches,createdAt,author
   ```

   Then filter for issues with significant discussion (5+ comments) or complex labels.

   For **any**:

   ```bash
   gh issue list --state open --limit 50 --json number,title,labels,body,comments,linkedBranches,createdAt,author
   ```

3. **Filter for actionable issues**:
   - Exclude issues that already have linked branches/PRs (indicates someone is working on it)
   - Prefer issues with clear reproduction steps or descriptions
   - Consider issue age (older untouched issues may be stale)

4. **Check for existing PRs**: For each promising issue, verify no PRs are pending:

   ```bash
   gh pr list --state open --search "fixes #<issue_number> OR closes #<issue_number> OR resolves #<issue_number>"
   ```

5. **Present findings**: Summarize 3-5 good candidate issues with:
   - Issue number and title
   - Labels
   - Brief description of the problem
   - Why it's a good candidate (clear scope, no pending PRs, etc.)
   - Link to the issue

## Example Query for Bugs Without PRs

```bash
gh issue list --state open --label "bug" --limit 20 --json number,title,labels,body,linkedBranches | \
  jq '[.[] | select(.linkedBranches | length == 0)]'
```

## Tips for the User

- Start with smaller, well-scoped issues to build familiarity with the codebase
- Check the CONTRIBUTING.md file for project-specific guidelines
- Look at recent merged PRs to understand code style and review expectations
- Comment on the issue before starting work to avoid duplicate effort

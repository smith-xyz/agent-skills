---
description: Create a test case to reproduce a GitHub issue
globs:
alwaysApply: false
---

# Reproduce GitHub Issue

When the user asks to reproduce an issue, create a test for an issue, or similar.

**Example invocations:**

- "Reproduce issue #123"
- "Create a test for issue #456"
- "Help me reproduce this bug"
- "Set up a test case for #789"

## Prerequisites

- The `gh` CLI must be installed and authenticated
- The current directory must be a git repository with a GitHub remote

## Workflow

### 1. Fetch Issue Details

```bash
gh issue view <issue_number> --json title,body,comments,labels,author
```

### 2. Analyze the Issue

Extract from the issue body and comments:

- **Error message**: The exact error or unexpected behavior
- **Environment**: Database type, Node version, package versions mentioned
- **Code snippets**: Entity definitions, query code, configuration
- **Reproduction steps**: What sequence of actions triggers the bug
- **Expected vs actual**: What should happen vs what does happen

### 3. Locate Existing Test Patterns

Search for similar tests in the codebase to understand conventions:

```bash
# Find test files for similar features
find test/ -name "*.test.ts" -o -name "*.spec.ts" | head -20

# Look for existing tests in github-issues folder if it exists
ls test/github-issues/ 2>/dev/null | tail -10
```

Examine existing tests to match:

- File naming conventions
- Directory structure
- Test framework usage (Jest, Mocha, etc.)
- How fixtures/entities are set up
- How assertions are written

### 4. Create Test Structure

Based on the project's conventions, create:

**For projects with `test/github-issues/` pattern:**

```text
test/github-issues/<issue_number>/
  - issue-<issue_number>.test.ts (or .spec.ts)
  - entity/
    - <EntityName>.ts (one per entity mentioned)
```

**For projects with flat test structure:**

```text
test/
  - issue-<issue_number>.test.ts
```

### 5. Build the Test Case

Create entities that match the issue description:

- Include all decorators/annotations mentioned
- Use the same column types and options
- Replicate relationships exactly as described
- Match naming (camelCase properties, snake_case columns if mentioned)

Create the test file:

- Import necessary testing utilities from the project
- Set up database connection matching the issue's environment
- Create seed data that triggers the bug
- Write the failing assertion based on expected behavior
- Add cleanup/teardown

### 6. Verify the Test

Run the test to confirm it reproduces the issue:

```bash
# Adjust based on project's test runner
npm test -- --grep "<issue_number>"
# or
pnpm test -- --grep "<issue_number>"
# or
yarn test --grep "<issue_number>"
```

### 7. Report Findings

After creating the test, summarize:

- Whether the issue was successfully reproduced
- The exact conditions that trigger the bug
- Any additional observations (e.g., works on some DB types but not others)
- Suggested area of code to investigate for the fix

## Tips

- Start with the minimal reproduction case, then add complexity if needed
- If the issue mentions specific versions, note them but test on current first
- Check if the issue is already fixed on the main branch
- Look for related closed issues that might have similar test patterns
- If entities extend a BaseEntity or use mixins, replicate that structure

## Common Patterns to Watch For

| Issue Type      | What to Look For                                         |
| --------------- | -------------------------------------------------------- |
| Query bugs      | JOIN types, ORDER BY, pagination (skip/take), subqueries |
| Entity bugs     | Inheritance, embedded entities, custom column names      |
| Migration bugs  | Schema changes, index creation, foreign keys             |
| Connection bugs | Multiple connections, connection pooling, transactions   |
| Type bugs       | Custom types, enum handling, JSON columns                |

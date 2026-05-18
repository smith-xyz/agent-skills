---
name: reproduce-issue
description: Reproduce a GitHub issue and build a test case using gh CLI. Use when user asks to reproduce an issue, create a test for an issue, or verify a bug.
disable-model-invocation: true
---

# Reproduce Issue

Create a test case to reproduce a GitHub issue. Requires `gh` CLI authenticated.

## Workflow

### 1. Fetch issue

```bash
gh issue view <issue_number> --json title,body,comments,labels,author
```

### 2. Extract from issue

- Error message / unexpected behavior
- Environment (versions, DB type, etc.)
- Code snippets (entities, queries, config)
- Reproduction steps
- Expected vs actual

### 3. Match project test conventions

Find existing test patterns: file naming, directory structure, framework, fixture setup, assertion style.

### 4. Create test

Follow the project's convention. Structure:

- Entities/fixtures matching the issue description exactly.
- Seed data that triggers the bug.
- Failing assertion based on expected behavior.
- Cleanup/teardown.

### 5. Run and report

Run the test. Summarize: reproduced or not, exact trigger conditions, observations, suggested area to investigate.

## Common issue patterns

| Type | Watch for |
| ---- | --------- |
| Query | JOIN types, ORDER BY, pagination, subqueries |
| Entity | Inheritance, embedded entities, custom column names |
| Migration | Schema changes, index creation, foreign keys |
| Connection | Multiple connections, pooling, transactions |
| Type | Custom types, enum handling, JSON columns |

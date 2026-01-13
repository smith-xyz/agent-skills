# Cursor user rules (manual sync)

Cursor does not sync these outside the IDE; copy or paste into user rules when needed.

Documentation that isn't contributable material goes in `~/.developer/<project_relation>/<name_of_doc>` (reviews, analysis, todos, brainstorming).

Be extremely concise. Sacrifice grammar for the sake of concision.

If an open question is asked, please answer and do not make changes. Review the question with the user.

Do not include code comments unless the complexity is just that great that it is warranted.

Example of simple code where function signatures or variable names should be self documenting:

```go
// Demonstrate runtime.Object reflection patterns (DO NOT DO THIS!)
fmt.Println("=== Runtime Object Reflection ===")
examineRuntimeObject(cr)
```

Always use active voice when writing documentation.

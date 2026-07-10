---
name: python-patterns
description: Python patterns - OOP, pydantic, dataclasses, type hints, concise code. Use when writing Python.
---

# Python Patterns

## Feature development workflow

1. **Clarify** - Input/output? Class responsibilities? External data?
2. **Plan** - Module structure, classes, data models
3. **Build** - Models, services, entry point

## Layout (application)

```text
src/<package>/
├── __init__.py
├── main.py          # Entry point
├── config.py        # Config dataclass/settings
├── models.py        # pydantic/dataclass models
├── services/        # Business logic classes
└── clients/         # External API clients
```

## Style

- **Concise** - Minimize lines, avoid boilerplate
- **OOP preferred** - Classes with clear responsibilities
- **Functional when simpler** - Comprehensions, map/filter for transforms
- **Type hints always** - All function signatures typed
- **Minimal logging** - Only log meaningful events, not flow

## Patterns

| Need | Pattern |
| ------ | --------- |
| External data | `pydantic.BaseModel` |
| Internal data | `@dataclass` |
| Config | `pydantic_settings.BaseSettings` or `@dataclass` + `os.getenv` |
| Optional | `Optional[T]` or `T \| None` |
| Transforms | List comprehensions, `map()`, `filter()` |
| Error context | `raise XError("context") from e` |
| Resources | Context managers (`with`) |
| Async | `async def` + `asyncio` |
| Concurrency limit | `asyncio.Semaphore` |
| Retry | Exponential backoff |

## References

- [references/idioms.py](references/idioms.py) - Concise Python idioms
- [references/patterns.py](references/patterns.py) - Service, repository, factory patterns
- [references/async.py](references/async.py) - Async patterns with asyncio

## Checklist

- Type hints on all signatures?
- pydantic for external, dataclass for internal?
- Comprehensions over loops where clearer?
- Errors have context?
- Logging only meaningful events?
- Classes have single responsibility?
- Package layout matches feature boundaries?

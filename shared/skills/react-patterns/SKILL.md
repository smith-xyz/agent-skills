---
name: react-patterns
description: React patterns for components, hooks, providers. Use when writing React/TSX code.
---

# React Patterns

**Requires:** `typescript-patterns` skill

## Feature development workflow

1. **Clarify** - Data needs? Existing components? State approach?
2. **Plan** - Components, hooks, providers, types needed
3. **Build bottom-up** - Types, hooks, components, integration

## Components

| Rule | Correct | Incorrect |
| ------ | --------- | ----------- |
| Export | `export function X` | `export default X` |
| Props | `interface XProps` | `type XProps = {}` |
| Style | `function X()` | `const X = () =>` |
| Lazy | `lazy(() => import('./X'))` | direct import for heavy |

## Hooks

- Name: `use<Name>`, File: `use<Name>.ts`
- Define return interface: `interface Use<Name>Return { ... }`
- Wrap handlers in `useCallback`
- Memoize expensive computations with `useMemo`

## Providers

- Context default: `undefined`
- Hook throws if used outside provider
- `useMemo` for context value
- `useCallback` for actions

## Testing

- Colocate tests with components
- Use `userEvent` over `fireEvent`
- `waitFor` for async assertions
- MSW for network mocking

## Structure

```text
src/
├── components/<Feature>/<Component>.tsx
├── hooks/use<Logic>.ts
├── providers/<Feature>Provider.tsx
└── types/<feature>.ts
```

## References

- [references/test-utils.tsx](references/test-utils.tsx) - Testing utilities setup
- [references/test-setup.ts](references/test-setup.ts) - Vitest setup file

## Assets

Copy and modify:

- [assets/component.tsx](assets/component.tsx)
- [assets/hook.ts](assets/hook.ts)
- [assets/provider.tsx](assets/provider.tsx)

## Checklist

- Types defined first?
- Logic in custom hooks?
- Single-purpose components?
- No `any` types (ask before using)?
- Handlers in `useCallback`?
- Context values memoized with `useMemo` where needed?

# Search signals

Use ripgrep on scoped paths. Confirm each hit in code before reporting.

## Error handling

| Pattern | Languages |
| ------- | --------- |
| `catch\s*\(\s*\)\s*\{` , `except:\s*pass` | TS/JS, Python |
| `_\s*=\s*.*err` , `//nolint:errcheck` | Go |
| `\.unwrap\(\)` , `expect\(` in library code | Rust |
| `console\.(log\|debug)` , `fmt\.Print` , `print\(` | TS, Go, Python |
| `return null` , `return undefined` after error | TS |

## Resources

| Pattern | Notes |
| ------- | ----- |
| `go func` | Pair with WaitGroup, errgroup, or context cancel |
| `new Promise` without `finally` | Hanging promise candidate |
| `setInterval` / `setTimeout` | Pair with `clearInterval` / `clearTimeout` |
| `Open(` , `Dial(` , `connect(` | Trace to Close |
| `context\.With` | Trace to `cancel()` |

## Concurrency

| Pattern | Notes |
| ------- | ----- |
| `mutex` , `Lock()` | Trace unlock on all paths |
| `shared` , `static mut` , global `var` | Race review |
| `select {` default:` | Busy spin risk |

## Logic

| Pattern | Notes |
| ------- | ----- |
| `TODO` , `FIXME` , `HACK` | Incomplete behavior |
| `== null` , `== undefined` , `!= nil` chains | Simplify with guards |
| `fallthrough` | Go switch intent |
| `default:` empty | Missing case handling |

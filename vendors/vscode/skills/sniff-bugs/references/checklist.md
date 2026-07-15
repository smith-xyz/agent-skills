# Sniff checklist

Work top to bottom. For each item, record pass or a finding with `path:line`.

## 1. Logic and control flow

- Map inputs to outputs for each public function and handler
- Exercise boundary values (empty, zero, max, nil/null, timeout)
- Confirm each `switch`/`match` arm returns or breaks as intended
- Confirm loop exit conditions and iterator exhaustion
- Flag code after `return`, `throw`, `panic`, or `break` that still runs

## 2. Error handling

- List every place an error can originate; trace to the caller
- Wrap errors with operation context (`fmt.Errorf`, `context`, custom type fields)
- Return or propagate at each layer; surface status codes at boundaries
- Use `Result` or typed errors for expected failures; reserve exceptions for exceptional cases
- Run failure paths: rollback, compensating action, or explicit partial-success docs

## 3. Resources and lifetime

- Pair every open/acquire with close/release on all paths (success and failure)
- Register cleanup in `defer`, `using`, `try/finally`, or RAII guards in declaration order
- Call `context.cancel()` from the same function that created the context
- End goroutines, tasks, and worker pools on shutdown signals
- Time out blocking I/O and respect parent context cancellation

## 4. State and variables

- Name shadowing that changes which binding a block uses
- Initialization before read; definite assignment in all branches
- Closure and callback captures (loop variables, stale `this`)
- Document invariants for mutable fields; enforce at setter boundaries

## 5. Concurrency

- Guard shared maps and counters with mutex, atomics, or confinement
- Document lock ordering; hold locks for minimal work
- Size channels and worker pools; handle backpressure
- Use `select` / context for cancellation and shutdown

## 6. Memory and GC (compiled / native)

- Profile or inspect hot paths for per-request allocation
- Clear or copy slices when reusing buffers across requests
- Drop references to large objects when work completes
- Size object pools; reset pooled objects before reuse

## 7. Observability and debugging

- Log errors with structured fields and wrapped cause
- Attach trace/span or request ID at ingress; propagate downstream
- Log decision points at debug; log failures at warn/error
- Remove temporary `print`, `dbg!`, `console.log`, and commented debug blocks before merge
- Expose health/readiness that reflects dependency failures

# Agent Selection

| Surface | Agent |
| --------- | ------- |
| Go | `go-dev` |
| TypeScript or Node, non-UI | `typescript-dev` |
| React or TSX UI | `react-dev` |
| Rust | `rust-dev` |
| Python | `python-dev` |
| Shell, infra, kubectl | `shell` |

Pick the agent matching the primary surface the step touches. When a step
spans two surfaces, split the step.

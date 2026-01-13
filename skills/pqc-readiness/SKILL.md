---
name: PQC Readiness Scanner
description: Analyze the complete crypto stack from code to OS for post-quantum migration readiness
---

# PQC Readiness Scanner

Analyze the complete crypto stack for post-quantum migration planning.

## Prerequisites

Read `references/pqc.md#nist-pqc-standards` for background on PQC algorithms.

## Workflow

Execute phases in order. Each phase has a **STOP** condition.

```text
CODE → PROTOCOLS → PACKAGE → PROVIDER → INFRASTRUCTURE → RUNTIME → AGILITY → REPORT
```

| Phase | Action | Reference | Stop If |
| ----- | ------ | --------- | ------- |
| 1 | Find crypto usage | `patterns.md#quantum-vulnerable-needs-migration` | No findings |
| 2 | Detect protocols | `patterns.md#protocol-detection` | - |
| 3 | Identify packages | `crypto-stack.md#language-package-provider-mapping` | - |
| 4 | Determine provider | `crypto-stack.md` (language section) | - |
| 5 | Check infrastructure | `infrastructure.md#dockerfile-analysis` | No Dockerfile |
| 6 | Flag runtime params | `report-templates.md#runtime-verification-section` | - |
| 7 | Assess agility | `crypto-agility.md#detection-patterns` | - |
| 8 | Generate report | `report-templates.md#report-structure` | - |

All references are in the `references/` folder.

## Phase 1: Code Analysis

**Reference:** `patterns.md#quantum-vulnerable-needs-migration`

Find crypto usage via grep patterns. For each finding, record:

- File and line number
- Crypto operation (sign, encrypt, hash, key exchange)
- Algorithm (RSA, ECDSA, AES, etc.)

Also check:

- `patterns.md#legacy-algorithms-deprecated` - DES, 3DES, RC4, MD5
- `patterns.md#jwt-jws-jwe-detection` - Token signing algorithms
- `patterns.md#key-lifecycle-detection` - Key management patterns

**STOP:** If no crypto findings, report "No quantum-vulnerable crypto detected" and end.

## Phase 2: Protocol Detection

**Reference:** `patterns.md#protocol-detection`

Identify what uses crypto:

| Check | Reference Section |
| ----- | ----------------- |
| HTTP servers/clients | `patterns.md#http-servers`, `patterns.md#http-clients` |
| gRPC | `patterns.md#grpc` |
| SSH | `patterns.md#ssh` |
| Message queues | `patterns.md#message-queue-detection` |
| Database TLS | `patterns.md#database-tls` |
| mTLS | `patterns.md#mtls--certificate-auth` |

Record: Protocol, Role (server/client), Count, TLS enabled.

## Phase 3: Package Identification

**Reference:** `crypto-stack.md#language-package-provider-mapping`

For each code finding, identify the package/library. Check the language-specific section:

- `crypto-stack.md#go`
- `crypto-stack.md#python`
- `crypto-stack.md#rust`
- `crypto-stack.md#java`
- `crypto-stack.md#javascriptnode`

## Phase 4: Provider Identification

**Reference:** `crypto-stack.md` (same language sections)

Key question: **Native or bindings?**

| Type | Example | PQC Path |
| ---- | ------- | -------- |
| Native | Go stdlib | Wait for Go PQC + change code |
| Bindings | Python cryptography → OpenSSL | Update OpenSSL + library |
| Wrapper | Rust ring → BoringSSL | Wait for ring update |

## Phase 5: Infrastructure Analysis

**References:**

| Check | Reference Section |
| ----- | ----------------- |
| Certificates/PKI | `infrastructure.md#certificate-and-pki-analysis` |
| API gateways | `infrastructure.md#api-gateway-and-proxy-analysis` |
| Dockerfile | `infrastructure.md#dockerfile-analysis` |
| Base images | `infrastructure.md#base-image-crypto-stacks` |
| FIPS mode | `infrastructure.md#fips-mode-detection` |
| Key management | `infrastructure.md#key-management-detection` |
| OpenShift | `infrastructure.md#openshift-detection` |

**STOP (soft):** If no Dockerfile/K8s manifests, note "Infrastructure analysis limited to code."

## Phase 6: Runtime Analysis

**Reference:** `report-templates.md#runtime-verification-section`

Flag findings where parameters are runtime-determined:

| Source | Example |
| ------ | ------- |
| ConfigMap | TLS min version from config |
| Secret | Key from mounted secret |
| Env var | Cipher suite from environment |
| CLI flag | Key size from argument |

For each, recommend verification method from `report-templates.md#verification-methods-by-language`.

## Phase 7: Agility Assessment

**Reference:** `crypto-agility.md#detection-patterns`

Assess migration difficulty:

| Check | Reference Section |
| ----- | ----------------- |
| Hardcoded algorithms | `crypto-agility.md#hardcoded-algorithms-low-agility` |
| Configurable algorithms | `crypto-agility.md#configurable-algorithms-high-agility` |
| Code centralization | `crypto-agility.md#centralized-vs-distributed-crypto` |
| Agility score | `crypto-agility.md#agility-score-template` |

## Phase 8: Report Generation

**Reference:** `report-templates.md#report-structure`

Generate report with:

| Section | Reference |
| ------- | --------- |
| Header | Timestamp, **model used**, codebase path |
| Crypto stack diagram | `report-templates.md#crypto-stack-diagram` (Mermaid) |
| Environment | `report-templates.md#report-structure` (Environment table) |
| PQC support | `report-templates.md#report-structure` (PQC Support table) |
| Protocol overview | `report-templates.md#report-structure` (Protocol Overview) |
| Full dependency graph | `report-templates.md#full-dependency-graph` (Mermaid) |
| Findings | `report-templates.md#finding-template---full-stack` (with per-finding diagrams) |
| Runtime items | `report-templates.md#runtime-finding-template` |
| Agility | `crypto-agility.md#report-section` |

**Required diagrams:**

- Crypto stack overview (code → package → provider → OS)
- Full dependency graph (all crypto usage across codebase)
- Per-finding chain diagrams

Save to `.work/pqc-scan/report.md`.

## Risk Assessment

Use these references when assessing each finding:

| Assessment | Reference |
| ---------- | --------- |
| Quantum vulnerability | `vulnerabilities.md#quantum-vulnerability` |
| Priority levels | `vulnerabilities.md#priority-levels` |
| Key size adequacy | `vulnerabilities.md#key-size-assessment` |
| PQC standards | `pqc.md#nist-pqc-standards` |
| Migration paths | `pqc.md#migration-paths` |

## References

| File | Sections |
| ---- | -------- |
| `patterns.md` | `#quantum-vulnerable-*`, `#protocol-detection`, `#jwt-*`, `#message-queue-*` |
| `crypto-stack.md` | `#go`, `#python`, `#rust`, `#java`, `#javascript*` |
| `infrastructure.md` | `#certificate-*`, `#api-gateway-*`, `#dockerfile-*`, `#openshift-*` |
| `crypto-agility.md` | `#detection-patterns`, `#agility-score-template`, `#report-section` |
| `vulnerabilities.md` | `#quantum-vulnerability`, `#priority-levels`, `#key-size-*` |
| `pqc.md` | `#nist-pqc-standards`, `#migration-paths`, `#timeline` |
| `report-templates.md` | `#report-structure`, `#finding-template-*`, `#runtime-*` |

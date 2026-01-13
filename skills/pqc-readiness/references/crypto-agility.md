# Crypto Agility Assessment

Evaluate how difficult PQC migration will be based on code architecture.

## What is Crypto Agility?

The ability to swap cryptographic algorithms without major code changes.

| Level | Description | Migration Effort |
| ----- | ----------- | ---------------- |
| High | Algorithms are configurable, abstracted | Low |
| Medium | Some hardcoding, but centralized | Medium |
| Low | Hardcoded throughout, no abstraction | High |

## Detection Patterns

### Hardcoded Algorithms (Low Agility)

```bash
grep -rn "RS256\|RSA-OAEP\|P-256\|secp256r1" --include="*.go" --include="*.py" .
grep -rn "SigningMethodRS256\|NewCipher.*aes" --include="*.go" .
grep -rn '"RSA"\|"ECDSA"\|"Ed25519"' --include="*.go" --include="*.py" --include="*.java" .
```

Signs of low agility:

- Algorithm names as string literals
- Direct crypto package imports spread across codebase
- No abstraction layer

### Configurable Algorithms (High Agility)

```bash
grep -rn "algorithm.*config\|config.*algorithm" -i --include="*.go" --include="*.py" .
grep -rn "SIGNING_ALGORITHM\|KEY_ALGORITHM" --include="*.go" --include="*.py" --include="*.yaml" .
grep -rn "getCryptoAlgorithm\|getSigningMethod" --include="*.go" --include="*.java" .
```

Signs of high agility:

- Algorithm selection from config/env
- Crypto abstraction interfaces
- Factory patterns for crypto operations
- Algorithm negotiation at runtime

### Centralized vs Distributed Crypto

| Pattern | Detection | Agility Impact |
| ------- | --------- | -------------- |
| Centralized | Single `crypto/` or `security/` package | Higher - one place to update |
| Distributed | Crypto imports in many packages | Lower - many changes needed |
| Wrapper | Custom crypto interface | Higher - swap implementation |
| Direct | Direct stdlib/library calls | Lower - refactor needed |

```bash
git grep -l "crypto/\|cryptography\|javax.crypto" | wc -l
git grep -l "crypto/\|cryptography\|javax.crypto" | xargs dirname | sort -u
```

## Agility Assessment Checklist

### Code Architecture

| Question | Yes = Higher Agility |
| -------- | -------------------- |
| Is there a central crypto package/module? | Easier to update |
| Are algorithms configured externally? | No code change needed |
| Are there crypto interfaces/abstractions? | Swap implementations |
| Is key management centralized? | Single update point |
| Are tests crypto-algorithm agnostic? | Tests won't break |

### Configuration Surface

| Question | Yes = Higher Agility |
| -------- | -------------------- |
| Can TLS cipher suites be configured? | Runtime update |
| Can JWT signing algorithm be changed? | Config change only |
| Can key sizes be adjusted? | No recompile |
| Are there algorithm fallbacks? | Graceful migration |

### Dependency Structure

| Question | Yes = Higher Agility |
| -------- | -------------------- |
| Using crypto abstraction library? | Library handles migration |
| Minimal direct crypto stdlib usage? | Less surface area |
| Version-pinned dependencies? | Controlled updates |
| Clear crypto dependency tree? | Easier auditing |

## Agility Score Template

```markdown
## Crypto Agility Assessment

| Factor | Score (1-5) | Notes |
| ------ | ----------- | ----- |
| Algorithm Configurability | X | [hardcoded/config/runtime] |
| Code Centralization | X | [single package/distributed] |
| Abstraction Layer | X | [none/partial/full] |
| Key Management | X | [file/env/KMS] |
| Test Independence | X | [algorithm-specific/agnostic] |

**Overall Agility:** [High/Medium/Low]

**Migration Complexity:**
- Files to modify: X
- Packages affected: X
- Config-only changes possible: [Yes/No]
```

## Improving Agility Before Migration

If agility is low, consider these refactors before PQC migration:

| Refactor | Effort | Benefit |
| -------- | ------ | ------- |
| Extract crypto to single package | Medium | Centralized updates |
| Add algorithm config | Low | Runtime switching |
| Create crypto interface | Medium | Swap implementations |
| Abstract key management | Medium | Decouple key format |

### Example: Go Crypto Interface

```go
type Signer interface {
    Sign(data []byte) ([]byte, error)
    Algorithm() string
}

type SignerFactory interface {
    Create(algorithm string) (Signer, error)
}
```

### Example: Python Algorithm Config

```python
SIGNING_CONFIG = {
    "algorithm": os.environ.get("SIGNING_ALGORITHM", "RS256"),
    "key_size": int(os.environ.get("KEY_SIZE", "2048")),
}
```

## Report Section

Include in PQC report:

```markdown
## Crypto Agility

**Level:** [High/Medium/Low]

| Metric | Value |
| ------ | ----- |
| Crypto-using files | X |
| Centralized package | [Yes/No] |
| Config-driven algorithms | [Yes/No] |
| Abstraction layer | [Yes/No] |

**Migration Approach:**
- [If High] Config updates + library upgrades
- [If Medium] Targeted code changes + config
- [If Low] Refactor first, then migrate

**Recommended Pre-Migration Refactors:**
1. [List if agility is low]
```

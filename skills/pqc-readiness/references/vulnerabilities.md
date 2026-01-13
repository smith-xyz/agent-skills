# Vulnerability Assessment

Risk classification for cryptographic findings.

## Quantum Vulnerability

| Algorithm | Vulnerable | Priority | Action |
| --------- | ---------- | -------- | ------ |
| RSA (key exchange) | Yes | P0 | Immediate planning |
| RSA (signing) | Yes | P1 | Plan migration |
| ECDH | Yes | P0 | Immediate planning |
| ECDSA | Yes | P1 | Plan migration |
| EdDSA (Ed25519) | Yes | P1 | Plan migration |
| DH/DHE | Yes | P0 | Immediate planning |
| X25519/X448 | Yes | P0 | Immediate planning |
| AES-256 | No | - | Safe |
| AES-128 | No | P2 | Upgrade recommended |
| SHA-256/384/512 | No | - | Safe |
| SHA-3 | No | - | Safe |

## Priority Levels

| Priority | Category | Risk | Timeline |
| -------- | -------- | ---- | -------- |
| **P0** | Key Exchange | Harvest-now-decrypt-later | Immediate |
| **P1** | Signatures | Long-lived artifacts | Plan now |
| **P2** | Symmetric upgrade | Future-proofing | Track |
| **Safe** | Quantum-resistant | None | No action |

## Key Size Adequacy

### Asymmetric (Transition Period)

| Algorithm | Weak | Minimum | Recommended |
| --------- | ---- | ------- | ----------- |
| RSA | < 2048 | 2048 | 3072+ |
| ECDSA | < P-256 | P-256 | P-384+ |
| EdDSA | - | Ed25519 | Ed25519 |

### Symmetric

| Algorithm | Weak | Recommended |
| --------- | ---- | ----------- |
| AES | 128 | 256 |
| ChaCha20 | - | 256 (default) |

### Hashing

| Algorithm | Status | Notes |
| --------- | ------ | ----- |
| MD5 | Broken | Never use |
| SHA-1 | Deprecated | Legacy only |
| SHA-256 | Safe | Recommended |
| SHA-384/512 | Safe | High security |
| SHA-3 | Safe | Modern alternative |

## Weak Encryption Patterns

### Mode Vulnerabilities

| Mode | Status | Issue |
| ---- | ------ | ----- |
| ECB | Critical | Deterministic, patterns visible |
| CBC | Review | Padding oracle without MAC |
| CTR | Review | No authentication |
| GCM | Safe | Authenticated encryption |
| CCM | Safe | Authenticated encryption |

### Detection Patterns

```bash
# ECB mode (critical)
grep -rn "ECB\|NewECB\|MODE_ECB" --include="*.go" --include="*.py" .

# CBC without MAC (review)
grep -rn "CBC\|NewCBC\|MODE_CBC" --include="*.go" --include="*.py" .
```

## Insecure Random

| Language | Insecure (CRITICAL) | Secure |
| -------- | ------------------- | ------ |
| Go | `math/rand` | `crypto/rand` |
| Python | `random` | `secrets` |
| JavaScript | `Math.random()` | `crypto.randomBytes()` |
| Java | `java.util.Random` | `SecureRandom` |
| Rust | Verify seed | `rand_core::OsRng` |
| C# | `System.Random` | `RNGCryptoServiceProvider` |

```bash
# Detect insecure random
grep -rn "math/rand\|random\.random\|Math\.random\|java\.util\.Random" \
  --include="*.go" --include="*.py" --include="*.js" --include="*.java" .
```

## Configuration Risk

| Source Type | Risk | Notes |
| ----------- | ---- | ----- |
| Hardcoded weak | HIGH | Immediate fix |
| Hardcoded adequate | MEDIUM | Plan migration |
| Config-driven | LOWER | Update without code change |
| Runtime/env | AUDIT | Verify all paths |
| Conditional | AUDIT | Document all branches |

## Risk Indicators

| Marker | Meaning | Mermaid Color |
| ------ | ------- | ------------- |
| `[!]` | Quantum vulnerable / Critical | `fill:#ff6b6b` |
| `[~]` | Needs upgrade / Warning | `fill:#ffa94d` |
| `[?]` | Needs runtime analysis | `fill:#ffd93d` |
| `[ok]` | PQC safe | `fill:#6bcb77` |

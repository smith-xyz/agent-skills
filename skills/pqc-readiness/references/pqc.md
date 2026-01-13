# Post-Quantum Cryptography Reference

## NIST PQC Standards (2024)

| Algorithm | Type | Standard | Use Case |
| --------- | ---- | -------- | -------- |
| ML-KEM (Kyber) | Lattice | FIPS 203 | Key encapsulation |
| ML-DSA (Dilithium) | Lattice | FIPS 204 | Digital signatures |
| SLH-DSA (SPHINCS+) | Hash-based | FIPS 205 | Digital signatures (stateless) |

## Go 1.24 PQC Support

Go 1.24 (February 2025) includes:

| Feature | Status | Package |
| ------- | ------ | ------- |
| ML-KEM-768 | Production | `crypto/mlkem` |
| ML-KEM-1024 | Production | `crypto/mlkem` |
| X25519MLKEM768 | Default in TLS | `crypto/tls` |
| ML-DSA | Not yet | - |

Key points:

- `crypto/mlkem` is in stdlib, not experimental
- TLS 1.3 uses X25519MLKEM768 hybrid by default (disable with `GODEBUG=tlsmlkem=0`)
- FIPS 140-3 compliance via `GOFIPS140` env var
- ML-DSA (signatures) not yet in stdlib - use `circl` for now

## Quantum-Vulnerable Algorithms

### Key Exchange (P0 - Highest Priority)

Vulnerable to harvest-now-decrypt-later attacks.

| Algorithm | Found In | Migration Path |
| --------- | -------- | -------------- |
| RSA key transport | TLS, S/MIME, PGP | ML-KEM or hybrid |
| ECDH | TLS, SSH, Signal | ML-KEM or hybrid |
| DH/DHE | TLS, IKE, SSH | ML-KEM or hybrid |
| X25519/X448 | TLS 1.3, WireGuard | ML-KEM or hybrid |

### Digital Signatures (P1)

Long-lived signatures need migration planning.

| Algorithm | Found In | Migration Path |
| --------- | -------- | -------------- |
| RSA signatures | Code signing, TLS certs, JWT | ML-DSA or hybrid |
| ECDSA | TLS, Bitcoin, code signing | ML-DSA |
| EdDSA (Ed25519) | SSH, TLS, JWT | ML-DSA |
| DSA | Legacy systems | ML-DSA |

### Encryption (P2)

Symmetric encryption is quantum-safe, but key exchange is the issue.

| Algorithm | Status | Notes |
| --------- | ------ | ----- |
| AES-128 | Safe (effectively 64-bit vs quantum) | Consider AES-256 |
| AES-256 | Safe (128-bit vs quantum) | No action needed |
| ChaCha20 | Safe | No action needed |

## Quantum-Safe (No Migration Needed)

| Category | Algorithms |
| -------- | ---------- |
| Symmetric encryption | AES-256, ChaCha20-Poly1305 |
| Hashing | SHA-256, SHA-384, SHA-512, SHA-3, BLAKE2/3 |
| MACs | HMAC-SHA256, Poly1305 |
| Key derivation | HKDF, PBKDF2, Argon2, scrypt |

## Hybrid Approaches

During transition, use hybrid schemes combining classical + PQC:

```text
TLS 1.3 + ML-KEM:  X25519 + ML-KEM-768 (Kyber768)
SSH:               ECDH + ML-KEM
Code signing:      ECDSA + ML-DSA
```

## Timeline Considerations

| Timeframe | Action |
| --------- | ------ |
| Now | Inventory crypto usage, identify P0/P1 |
| 2024-2025 | Standards finalized, libraries maturing |
| 2025-2027 | Begin hybrid deployments for P0 |
| 2027-2030 | Full migration for P0/P1 systems |
| 2030+ | Deprecate classical-only crypto |

## Detection Patterns

### RSA (Vulnerable)

```bash
grep -rE "(RSA|rsa\.GenerateKey|crypto/rsa)" --include="*.go" .
grep -rE "(RSA|from Crypto\.PublicKey import RSA)" --include="*.py" .
```

### ECDSA/ECDH (Vulnerable)

```bash
grep -rE "(ECDSA|ECDH|ecdsa\.|elliptic\.)" --include="*.go" .
grep -rE "(ECDSA|ec\.generate_private_key)" --include="*.py" .
```

### EdDSA (Vulnerable)

```bash
grep -rE "(Ed25519|ed25519)" --include="*.go" --include="*.py" --include="*.rs" .
```

### DH (Vulnerable)

```bash
grep -rE "(DiffieHellman|DHE|dh\.generate)" --include="*.go" --include="*.py" .
```

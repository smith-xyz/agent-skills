# Crypto Stack Reference

Mapping from code to underlying crypto provider.

## Stack Overview

```text
Code → Package → Provider → OS
```

Understanding this chain is essential for PQC planning.

## Go

| Package | Provider | PQC Path |
| ------- | -------- | -------- |
| `crypto/rsa` | Go native | ML-KEM in Go 1.24+, ML-DSA not yet |
| `crypto/ecdsa` | Go native | Go stdlib PQC |
| `crypto/ed25519` | Go native | Go stdlib PQC |
| `crypto/aes` | Go native | Already quantum-safe (256-bit) |
| `golang.org/x/crypto/...` | Go native | x/crypto PQC packages |
| `github.com/cloudflare/circl` | Go native | PQC algorithms available now |

**Go notes:**

- Go uses native crypto implementation by default (not OpenSSL)
- PQC: ML-KEM in Go 1.24+ (stdlib), ML-DSA not yet in stdlib

**Go FIPS modes:**

| Mode | CGO | Provider | Notes |
| ---- | --- | -------- | ----- |
| Native FIPS | `CGO_ENABLED=0` | Go Cryptographic Module | `GODEBUG=fips140=1`, Go 1.24+ certification in progress |
| golang-fips | `CGO_ENABLED=1` | OpenSSL/BoringCrypto | Red Hat approach, drop-in replacement, already FIPS certified |

Detection:

```bash
go env CGO_ENABLED
grep -r "GODEBUG.*fips" .
```

If CGO_ENABLED=1 on RHEL/UBI, likely using golang-fips with OpenSSL backend.

## Python

| Package | Provider | PQC Path |
| ------- | -------- | -------- |
| `hashlib` | OpenSSL (usually) | Update OpenSSL |
| `cryptography` | OpenSSL bindings | OpenSSL 3.2+ with OQS provider |
| `pycryptodome` | Native Python | Wait for library update |
| `pyopenssl` | OpenSSL bindings | OpenSSL 3.2+ with OQS provider |
| `liboqs-python` | liboqs | PQC available now |

**Python notes:**

- Most crypto goes through OpenSSL
- PQC via OpenSSL OQS provider or liboqs bindings
- Check: `python -c "import ssl; print(ssl.OPENSSL_VERSION)"`

## Rust

| Package | Provider | PQC Path |
| ------- | -------- | -------- |
| `ring` | BoringSSL (partial) | Wait for ring PQC support |
| `rustls` | ring | Follows ring |
| `openssl` crate | OpenSSL bindings | OpenSSL 3.2+ with OQS provider |
| `rust-crypto` | Native Rust | Deprecated, avoid |
| `pqcrypto` | liboqs bindings | PQC available now |
| `aws-lc-rs` | AWS-LC (BoringSSL fork) | ML-KEM available |

**Rust notes:**

- `ring` is popular but PQC support pending
- `aws-lc-rs` has ML-KEM now
- `pqcrypto` for immediate PQC needs

## Java

| Package | Provider | PQC Path |
| ------- | -------- | -------- |
| `java.security.*` | JCE (JDK default) | Wait for JDK PQC |
| `javax.crypto.*` | JCE (JDK default) | Wait for JDK PQC |
| `org.bouncycastle.*` | Bouncy Castle | PQC available now (bcpqc) |

**Java notes:**

- JDK crypto is pluggable (JCE)
- Bouncy Castle has PQC implementations
- FIPS: Use certified providers

## JavaScript/Node.js

| Package | Provider | PQC Path |
| ------- | -------- | -------- |
| `crypto` (built-in) | OpenSSL | Update Node.js + OpenSSL |
| `node:crypto` | OpenSSL | Update Node.js + OpenSSL |
| `crypto-js` | Pure JS | Wait for library update |
| `node-forge` | Pure JS | Wait for library update |

**Node notes:**

- Built-in crypto uses OpenSSL
- Check: `node -e "console.log(process.versions.openssl)"`
- Pure JS libs slower, may lag on PQC

## C/C++

| Library | Notes | PQC Path |
| ------- | ----- | -------- |
| OpenSSL | Most common | OpenSSL 3.2+ with OQS provider |
| BoringSSL | Google's fork | PQC in progress |
| LibreSSL | OpenBSD fork | PQC status unclear |
| NSS | Mozilla | PQC in progress |
| Libgcrypt | GnuPG | PQC support pending |
| liboqs | OQS Project | PQC reference implementation |

## Crypto Provider Versions

### OpenSSL

| Version | PQC Status |
| ------- | ---------- |
| 1.1.x | No PQC |
| 3.0.x | No native PQC, OQS provider available |
| 3.2+ | OQS provider, native PQC planned |

Check version:

```bash
openssl version
# or in container
docker run --rm <image> openssl version
```

### BoringSSL

| Status | Notes |
| ------ | ----- |
| ML-KEM | Available (Kyber) |
| ML-DSA | In progress |

Used by: Chrome, Android, AWS-LC, Cloudflare

### Go Native

| Go Version | Crypto Notes |
| ---------- | ------------ |
| 1.21+ | FIPS mode via GODEBUG |
| 1.22+ | Improved TLS 1.3 |
| 1.24+ | ML-KEM (crypto/mlkem), TLS hybrid default |

**Go TLS cipher configuration:**

| TLS Version | Cipher Config | Notes |
| ----------- | ------------- | ----- |
| TLS 1.2 | `Config.CipherSuites` | Configurable |
| TLS 1.3 | Fixed, not configurable | Uses Go defaults |

TLS 1.3 ciphers are hardcoded in Go - `Config.CipherSuites` only affects TLS 1.2.

For Go 1.24+ PQC:

- X25519MLKEM768 is default for TLS 1.3 key exchange
- Disable with `GODEBUG=tlsmlkem=0`
- Cannot select specific TLS 1.3 ciphers via config

## FIPS Considerations

| Provider | FIPS Support |
| -------- | ------------ |
| OpenSSL 3.x | FIPS provider module |
| Go | GODEBUG=fips140=1 |
| BoringCrypto | Google's FIPS module |
| Bouncy Castle | FIPS certified version |

**FIPS + PQC conflict:**

- FIPS currently doesn't include PQC algorithms
- Hybrid approaches may have FIPS issues
- Watch for NIST FIPS updates post-standardization

## Quick Provider Detection

```bash
# Go - check if using CGO (might link OpenSSL)
go env CGO_ENABLED

# Python - check OpenSSL version
python -c "import ssl; print(ssl.OPENSSL_VERSION)"

# Node - check OpenSSL version
node -e "console.log(process.versions.openssl)"

# Rust - check Cargo.toml for openssl vs ring
grep -E "openssl|ring|aws-lc" Cargo.toml

# Container - check OpenSSL
docker run --rm <image> openssl version
```

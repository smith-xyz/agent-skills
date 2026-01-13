# Detection Patterns

Language-specific patterns for finding cryptographic usage, organized by quantum vulnerability.

## Quantum-Vulnerable (Needs Migration)

### RSA

| Language | Pattern |
| -------- | ------- |
| Go | `grep -rE "(crypto/rsa\|rsa\.GenerateKey\|rsa\.EncryptPKCS)" --include="*.go" .` |
| Python | `grep -rE "(from.*RSA\|RSA\.generate\|PKCS1_OAEP)" --include="*.py" .` |
| Java | `grep -rE "(RSA\|KeyPairGenerator.*RSA)" --include="*.java" .` |
| JavaScript | `grep -rE "(createSign.*RSA\|RSA-)" --include="*.js" --include="*.ts" .` |
| Rust | `grep -rE "(rsa::\|RsaPrivateKey)" --include="*.rs" .` |
| C/C++ | `grep -rE "(RSA_generate_key\|EVP_PKEY_RSA)" --include="*.c" --include="*.cpp" .` |

### ECDSA/ECDH

| Language | Pattern |
| -------- | ------- |
| Go | `grep -rE "(crypto/ecdsa\|crypto/ecdh\|elliptic\.)" --include="*.go" .` |
| Python | `grep -rE "(ec\.generate_private_key\|ECDSA\|ECDH)" --include="*.py" .` |
| Java | `grep -rE "(ECDSA\|ECDH\|EC.*KeyPair)" --include="*.java" .` |
| JavaScript | `grep -rE "(createECDH\|ECDSA)" --include="*.js" --include="*.ts" .` |
| Rust | `grep -rE "(ecdsa::\|p256::\|p384::)" --include="*.rs" .` |

### EdDSA (Ed25519/Ed448)

| Language | Pattern |
| -------- | ------- |
| Go | `grep -rE "(crypto/ed25519\|ed25519\.)" --include="*.go" .` |
| Python | `grep -rE "(Ed25519\|ed25519)" --include="*.py" .` |
| Rust | `grep -rE "(ed25519::\|ed25519_dalek)" --include="*.rs" .` |
| All | `grep -rE "(Ed25519\|Ed448\|EdDSA)" .` |

### Diffie-Hellman

| Language | Pattern |
| -------- | ------- |
| Go | `grep -rE "(crypto/dh\|DiffieHellman)" --include="*.go" .` |
| Python | `grep -rE "(dh\.generate\|DiffieHellman)" --include="*.py" .` |
| Java | `grep -rE "(DHParameterSpec\|DiffieHellman)" --include="*.java" .` |
| JavaScript | `grep -rE "(createDiffieHellman\|getDiffieHellman)" --include="*.js" .` |

### Legacy Algorithms (Deprecated)

These should be flagged as security issues regardless of PQC:

| Algorithm | Pattern | Severity |
| --------- | ------- | -------- |
| DES | `DES`, `des\.`, `DESede` | Critical |
| 3DES | `TripleDES`, `DESede`, `3DES` | High |
| RC4 | `RC4`, `ARC4`, `ARCFOUR` | Critical |
| MD5 | `MD5`, `md5\.`, `hashlib\.md5` | High |
| SHA1 | `SHA1`, `sha1\.`, `hashlib\.sha1` | Medium |
| Blowfish | `Blowfish`, `blowfish\.` | Medium |

```bash
grep -rE "(DES|TripleDES|DESede|RC4|ARC4|Blowfish)" --include="*.go" --include="*.py" --include="*.java" .
grep -rE "(MD5|md5\.|hashlib\.md5)" --include="*.go" --include="*.py" .
```

## Quantum-Safe (No Migration Needed)

### AES

```bash
grep -rE "(crypto/aes|AES|aes\.NewCipher)" --include="*.go" .
grep -rE "(from.*AES|algorithms\.AES)" --include="*.py" .
```

### SHA-2/SHA-3

```bash
grep -rE "(crypto/sha256|crypto/sha512|sha3)" --include="*.go" .
grep -rE "(hashlib\.sha256|hashlib\.sha3)" --include="*.py" .
```

### HMAC

```bash
grep -rE "(crypto/hmac|hmac\.New)" --include="*.go" .
grep -rE "(hmac\.new|HMAC)" --include="*.py" .
```

## TLS/Key Exchange Detection

Find TLS configurations (check for quantum-vulnerable key exchange):

```bash
grep -rE "(tls\.Config|MinVersion|CipherSuites)" --include="*.go" .
grep -rE "(ssl\.create_default_context|SSLContext)" --include="*.py" .
grep -rE "(https\.createServer|tls\.connect)" --include="*.js" .
```

## Import-Based Detection

Quick language-specific crypto import detection:

```bash
# Go
grep -rE "import.*\"crypto/(rsa|ecdsa|ecdh|ed25519|dh)\"" --include="*.go" .

# Python
grep -rE "(from.*Crypto\.|from cryptography\.)" --include="*.py" .

# Java
grep -rE "(java\.security\.|javax\.crypto\.)" --include="*.java" .

# Rust
grep -rE "(use (ring|rustls|rsa|ecdsa|ed25519))" --include="*.rs" .
```

## Dependency Files

Check for crypto libraries in dependencies:

| Language | File | Command |
| -------- | ---- | ------- |
| Go | `go.mod` | `grep -E "(jose\|jwt\|crypto)" go.mod` |
| Python | `requirements.txt` | `grep -iE "(cryptography\|pycryptodome)" requirements.txt` |
| Node | `package.json` | `grep -E "(crypto\|jose\|jsonwebtoken)" package.json` |
| Rust | `Cargo.toml` | `grep -E "(ring\|rustls\|rsa\|ecdsa)" Cargo.toml` |

## JWT/JWS/JWE Detection

Token security - signing algorithms are quantum-vulnerable:

### JWT Libraries

| Language | Pattern |
| -------- | ------- |
| Go | `github.com/golang-jwt/jwt`, `github.com/lestrrat-go/jwx`, `gopkg.in/square/go-jose` |
| Python | `pyjwt`, `python-jose`, `authlib` |
| Node | `jsonwebtoken`, `jose`, `node-jose` |
| Java | `io.jsonwebtoken`, `com.nimbusds.jose`, `org.jose4j` |
| Rust | `jsonwebtoken`, `josekit` |

### Signing Algorithm Detection

| Algorithm | Pattern | PQC Status |
| --------- | ------- | ---------- |
| RS256/RS384/RS512 | `RS256`, `RS384`, `RS512`, `RSA` | Vulnerable |
| ES256/ES384/ES512 | `ES256`, `ES384`, `ES512`, `ECDSA` | Vulnerable |
| EdDSA | `EdDSA`, `Ed25519` | Vulnerable |
| HS256/HS384/HS512 | `HS256`, `HS384`, `HS512`, `HMAC` | Safe (symmetric) |
| PS256/PS384/PS512 | `PS256`, `PS384`, `PS512`, `RSA-PSS` | Vulnerable |

```bash
grep -rE "(RS256|RS384|RS512|ES256|ES384|ES512|EdDSA|PS256)" --include="*.go" --include="*.py" --include="*.js" --include="*.ts" .
grep -rE "(SigningMethodRS|SigningMethodES|SigningMethodEdDSA)" --include="*.go" .
grep -rE "(jwt\.encode|jwt\.decode|JWT)" --include="*.py" .
```

### JWE Encryption Detection

| Algorithm | Pattern | PQC Status |
| --------- | ------- | ---------- |
| RSA-OAEP | `RSA-OAEP`, `RSA1_5` | Vulnerable (key wrap) |
| ECDH-ES | `ECDH-ES`, `ECDH-ES+` | Vulnerable (key agreement) |
| A256GCM | `A256GCM`, `A128GCM` | Safe (content encryption) |
| dir | `dir` | Safe (direct symmetric) |

## Message Queue Detection

Event/messaging systems with TLS:

| System | Pattern | Notes |
| ------ | ------- | ----- |
| Kafka | `kafka\.`, `confluent`, `sarama`, `franz-go` | SASL + TLS |
| RabbitMQ | `amqp://`, `amqps://`, `pika\.`, `streadway/amqp` | AMQP TLS |
| Redis | `rediss://`, `redis\.NewClient`, `go-redis` | TLS mode |
| NATS | `nats\.`, `nats://`, `nats-io` | TLS optional |
| Pulsar | `pulsar://`, `pulsar-client` | TLS + auth |
| SQS | `sqs\.`, `aws-sdk.*sqs` | AWS managed |
| Pub/Sub | `pubsub\.`, `cloud.google.com/go/pubsub` | GCP managed |

```bash
grep -rE "(kafka\.|sarama\.|confluent)" --include="*.go" .
grep -rE "(amqp://|amqps://|pika\.)" --include="*.py" .
grep -rE "(nats\.|nats://)" --include="*.go" --include="*.py" .
```

### Message Payload Encryption

Look for application-level encryption of message payloads:

```bash
grep -rE "(Encrypt.*Message|Message.*Encrypt|payload.*encrypt)" -i .
grep -rE "(AES|RSA).*json\.Marshal" --include="*.go" .
```

## Key Lifecycle Detection

Key management patterns:

| Pattern | What It Indicates |
| ------- | ----------------- |
| `GenerateKey`, `NewKey` | Key generation |
| `LoadKey`, `ParseKey`, `ReadKey` | Key loading from storage |
| `RotateKey`, `rotation` | Key rotation logic |
| `ExportKey`, `Marshal`, `Encode` | Key serialization |
| `pem.Encode`, `x509.Marshal` | Key format (PEM/DER) |

### Key Storage Formats

| Format | Pattern | Notes |
| ------ | ------- | ----- |
| PEM | `pem\.Encode`, `pem\.Decode`, `-----BEGIN` | Text, common |
| DER | `x509\.Marshal`, `asn1\.Marshal` | Binary |
| JWK | `jwk\.`, `JSON Web Key` | JSON, modern |
| PKCS#12 | `pkcs12`, `.p12`, `.pfx` | Bundle with cert |
| PKCS#8 | `pkcs8`, `PRIVATE KEY` | Encrypted private key |

```bash
grep -rE "(pem\.|PEM|-----BEGIN)" --include="*.go" --include="*.py" .
grep -rE "(\.p12|\.pfx|pkcs12)" .
grep -rE "(jwk\.|JWK|JSON Web Key)" --include="*.go" --include="*.py" --include="*.js" .
```

## Protocol Detection

Identify what's using crypto to understand attack surface and prioritize migration.

### HTTP Servers

| Language | Pattern | Notes |
| -------- | ------- | ----- |
| Go | `grep -rE "(ListenAndServeTLS\|http\.Server\|gin\|echo\|fiber)" --include="*.go" .` | Continuous |
| Python | `grep -rE "(uvicorn\|gunicorn\|Flask\|FastAPI\|Django)" --include="*.py" .` | |
| Rust | `grep -rE "(actix-web\|axum\|warp\|hyper::Server)" --include="*.rs" .` | |
| Node | `grep -rE "(app\.listen\|createServer\|express\(\))" --include="*.js" --include="*.ts" .` | |
| Java | `grep -rE "(@RestController\|HttpServer\|Jetty\|Tomcat)" --include="*.java" .` | |

### HTTP Clients

| Language | Pattern |
| -------- | ------- |
| Go | `http\.Client`, `http\.Get`, `http\.Post`, `resty`, `req\.` |
| Python | `requests\.`, `httpx\.`, `urllib\.`, `aiohttp` |
| Rust | `reqwest::`, `hyper::Client`, `ureq::` |
| Node | `fetch`, `axios`, `got`, `node-fetch` |
| Java | `HttpClient`, `OkHttpClient`, `RestTemplate` |

### gRPC

| Language | Pattern |
| -------- | ------- |
| Go | `grep -rE "(grpc\.Dial\|grpc\.NewServer\|google\.golang\.org/grpc)" --include="*.go" .` |
| Python | `grep -rE "(grpc\.\|grpcio)" --include="*.py" .` |
| Rust | `grep -rE "(tonic::\|grpc-rs)" --include="*.rs" .` |
| All | `grep -rE "\.proto$" .` |

### SSH

| Language | Pattern | Notes |
| -------- | ------- | ----- |
| Go | `grep -rE "(golang\.org/x/crypto/ssh\|ssh\.Dial\|ssh\.Client)" --include="*.go" .` | Client/server |
| Python | `grep -rE "(paramiko\|asyncssh\|fabric)" --include="*.py" .` | |
| Rust | `grep -rE "(russh\|thrussh\|ssh2::)" --include="*.rs" .` | |
| All | `grep -rE "(ssh://\|\.ssh/\|id_rsa\|id_ed25519)" .` | Config refs |

### WebSocket

| Language | Pattern |
| -------- | ------- |
| Go | `grep -rE "(gorilla/websocket\|nhooyr\.io/websocket\|websocket\.Upgrader)" --include="*.go" .` |
| Python | `grep -rE "(websockets\|websocket-client)" --include="*.py" .` |
| Rust | `grep -rE "(tokio-tungstenite\|websocket::)" --include="*.rs" .` |
| Node | `grep -rE "(ws\|socket\.io\|WebSocket)" --include="*.js" --include="*.ts" .` |

### Database TLS

| Type | Pattern |
| ---- | ------- |
| PostgreSQL | `grep -rE "(sslmode=\|sslrootcert=)" .` |
| MySQL | `grep -rE "(tls=\|ssl-ca=\|useSSL)" .` |
| MongoDB | `grep -rE "(tls=true\|ssl=true\|tlsCAFile)" .` |
| Redis | `grep -rE "(rediss://\|tls_cert_reqs)" .` |

### mTLS / Certificate Auth

| Language | Pattern |
| -------- | ------- |
| Go | `grep -rE "(tls\.RequireAndVerifyClientCert\|ClientCAs\|GetClientCertificate)" --include="*.go" .` |
| Python | `grep -rE "(ssl\.CERT_REQUIRED\|load_verify_locations)" --include="*.py" .` |
| All | `grep -rE "(client.*cert\|mtls\|mutual.*tls)" -i .` |

## Protocol Summary Template

After detection, summarize:

```markdown
## Protocol Overview

| Protocol | Role | Count | TLS | PQC Impact |
| -------- | ---- | ----- | --- | ---------- |
| HTTP | Server | 2 | Yes | P0 - Key exchange |
| HTTP | Client | 4 | Yes | P0 - Key exchange |
| gRPC | Server | 1 | mTLS | P0 + P1 (certs) |
| SSH | Client | 1 | Yes | P1 - Host keys |
| PostgreSQL | Client | 1 | Yes | P0 - Key exchange |
| WebSocket | Server | 1 | wss:// | P0 - Key exchange |

### Server vs Client Migration

| Role | Priority | Reason |
| ---- | -------- | ------ |
| Server | Higher | Must support both legacy and PQC clients during transition |
| Client | Lower | Can update once server supports PQC |
```

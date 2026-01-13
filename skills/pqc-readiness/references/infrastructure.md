# Infrastructure Analysis

Understand the runtime environment before analyzing code.

## Certificate and PKI Analysis

Certificates are a major PQC migration surface - signing algorithms need updating.

### Certificate Detection

```bash
find . -name "*.pem" -o -name "*.crt" -o -name "*.cer" -o -name "*.key" 2>/dev/null
grep -rE "(x509\.|certificate|Certificate)" --include="*.go" --include="*.py" --include="*.java" .
grep -rE "(LoadX509|ParseCertificate|tls\.Certificate)" --include="*.go" .
```

### Certificate Signing Algorithms

| Algorithm | Pattern | PQC Status |
| --------- | ------- | ---------- |
| RSA-SHA256 | `SHA256WithRSA`, `sha256WithRSAEncryption` | Vulnerable |
| RSA-SHA384/512 | `SHA384WithRSA`, `SHA512WithRSA` | Vulnerable |
| ECDSA-SHA256 | `ECDSAWithSHA256`, `ecdsa-with-SHA256` | Vulnerable |
| Ed25519 | `Ed25519` | Vulnerable |

### Certificate Chain Analysis

| Level | What to Check | PQC Impact |
| ----- | ------------- | ---------- |
| Leaf | Server/client certs | Update first |
| Intermediate | CA certs | Coordinate with CA |
| Root | Trust anchors | OS/browser updates |

```bash
openssl x509 -in cert.pem -text -noout | grep -E "Signature Algorithm|Public Key Algorithm"
```

### cert-manager Detection

```bash
grep -rE "(cert-manager|Certificate|Issuer|ClusterIssuer)" --include="*.yaml" .
grep -rE "(secretName.*tls|tls.*secretName)" --include="*.yaml" .
```

### Certificate Considerations

| Item | Question | Impact |
| ---- | -------- | ------ |
| Validity | When do certs expire? | Timing vs PQC availability |
| Automation | cert-manager or manual? | Easier to update automated |
| CA Provider | Let's Encrypt, internal, commercial? | CA must support PQC |
| Chain Depth | How many intermediates? | Each needs updating |

## API Gateway and Proxy Analysis

TLS termination points are critical for PQC migration.

### Ingress Controllers

| Controller | Detection Pattern | TLS Config |
| ---------- | ----------------- | ---------- |
| NGINX Ingress | `kubernetes.io/ingress.class: nginx` | `nginx.ingress.kubernetes.io/ssl-*` |
| Traefik | `kubernetes.io/ingress.class: traefik` | IngressRoute CRD |
| HAProxy | `kubernetes.io/ingress.class: haproxy` | ConfigMap |
| Kong | `kubernetes.io/ingress.class: kong` | KongPlugin CRD |
| Contour | `projectcontour.io/Ingress` | HTTPProxy CRD |

```bash
grep -rE "(ingress\.class|IngressClassName)" --include="*.yaml" .
grep -rE "(HTTPProxy|IngressRoute|KongPlugin)" --include="*.yaml" .
```

### Service Mesh TLS

| Mesh | Detection | Cipher Config |
| ---- | --------- | ------------- |
| Istio | `ServiceMeshControlPlane`, `VirtualService` | DestinationRule `tls.mode` |
| Linkerd | `linkerd.io/inject` | linkerd-config ConfigMap |
| Consul Connect | `consul.hashicorp.com/connect-inject` | Consul intentions |

```bash
grep -rE "(VirtualService|DestinationRule|Gateway)" --include="*.yaml" .
grep -rE "(linkerd\.io|consul\.hashicorp\.com)" --include="*.yaml" .
```

### Envoy/Istio Cipher Suites

```bash
grep -rE "(cipherSuites|minProtocolVersion|TLSv1_3)" --include="*.yaml" .
grep -rE "(ECDHE|DHE|RSA|AES|CHACHA)" --include="*.yaml" .
```

### API Gateway TLS

| Gateway | Detection | Config Location |
| ------- | --------- | --------------- |
| Kong | `apiVersion: configuration.konghq.com` | KongPlugin, Secrets |
| Ambassador | `getambassador.io` | Module CRD |
| AWS API Gateway | Terraform `aws_api_gateway_*` | Via AWS ACM |
| GCP API Gateway | `google_api_gateway_*` | GCP managed |

## Detect Infrastructure Files

```bash
# Container/orchestration
ls Dockerfile* docker-compose* 2>/dev/null
ls -d kubernetes/ k8s/ helm/ charts/ 2>/dev/null

# Cloud provider
ls -d terraform/ pulumi/ cloudformation/ 2>/dev/null

# CI/CD
ls .github/workflows/*.yml .gitlab-ci.yml Jenkinsfile 2>/dev/null
```

## Dockerfile Analysis

| Item | What to Find | Why It Matters |
| ---- | ------------ | -------------- |
| Base image | `FROM` line | Determines available crypto libs |
| Packages | `apt-get`, `apk add` | OpenSSL version, FIPS modules |
| Environment | `ENV` lines | Crypto config, key paths |
| Secrets | `COPY`, volumes | Key management approach |

### Base Image Crypto Stacks

| Image | Default Crypto | Notes |
| ----- | -------------- | ----- |
| `alpine` | LibreSSL | Lighter, less features |
| `debian`, `ubuntu` | OpenSSL | Full-featured |
| `distroless` | BoringSSL | Google's fork |
| `ubi` (Red Hat) | OpenSSL + FIPS | Enterprise |

### FIPS Mode Detection

```bash
# Go
grep -rn "GODEBUG=fips" Dockerfile* .
grep -rn "crypto/tls/fipsonly" --include="*.go" .

# OpenSSL
grep -rn "OPENSSL_FIPS\|fips=1" Dockerfile* .
```

## Key Management Detection

```bash
# AWS KMS
grep -rn "kms\|KMS\|aws-sdk.*kms" --include="*.go" --include="*.py" .

# Azure Key Vault
grep -rn "keyvault\|KeyVault" --include="*.go" --include="*.py" .

# GCP Cloud KMS
grep -rn "cloud.google.com/go/kms\|google-cloud-kms" --include="*.go" --include="*.py" .

# HashiCorp Vault
grep -rn "vault\|VAULT_ADDR\|hvac" --include="*.go" --include="*.py" .

# HSM / PKCS#11
grep -rn "pkcs11\|PKCS11\|softhsm\|CloudHSM" --include="*.go" --include="*.py" .
```

## Cloud Crypto Services

| Cloud | Service | Detection Pattern |
| ----- | ------- | ----------------- |
| AWS | KMS | `aws-sdk`, `boto3`, `kms:` |
| AWS | CloudHSM | `cloudhsm`, `CLOUDHSM` |
| AWS | ACM | `acm`, `certificate-manager` |
| Azure | Key Vault | `azure-keyvault`, `@azure/keyvault` |
| Azure | Managed HSM | `managedhsm` |
| GCP | Cloud KMS | `cloud.google.com/go/kms` |
| GCP | Certificate Manager | `certificatemanager` |

## OpenShift Detection

### Detect OpenShift Environment

```bash
# OpenShift manifests
ls -d openshift/ deploy/ manifests/ 2>/dev/null
find . -name "*.yaml" -exec grep -l "kind: Route\|kind: DeploymentConfig" {} \; 2>/dev/null | head -5

# Operator manifests
find . -name "*.yaml" -exec grep -l "ClusterServiceVersion\|Subscription" {} \; 2>/dev/null | head -5

# Service mesh
grep -rn "ServiceMeshControlPlane\|ServiceMeshMemberRoll" --include="*.yaml" .
```

### OpenShift Platform Variants

| Variant | Crypto Notes |
| ------- | ------------ |
| Bare Metal | Full FIPS control, custom certs |
| ROSA (AWS) | AWS KMS integration, ACM certs |
| ARO (Azure) | Azure Key Vault integration |
| OCP on GCP | GCP KMS integration |
| OCP Local (CRC) | Development only |

### OpenShift Crypto Features

```bash
# Route TLS configuration
grep -rn "tls:\|termination:\|insecureEdgeTerminationPolicy" --include="*.yaml" .

# Service mesh mTLS
grep -rn "mtls:\|PeerAuthentication\|DestinationRule" --include="*.yaml" .

# cert-manager / OpenShift certs
grep -rn "cert-manager\|Certificate\|Issuer\|service.beta.openshift.io/serving-cert" --include="*.yaml" .

# Sealed secrets / External secrets
grep -rn "SealedSecret\|ExternalSecret\|SecretStore" --include="*.yaml" .
```

### FIPS Mode on OpenShift

```bash
# Check for FIPS machine config
grep -rn "fips:\|FIPS" --include="*.yaml" .

# MachineConfig for FIPS
grep -rn "MachineConfig" --include="*.yaml" . | head -5
```

OpenShift FIPS considerations:

| Component | FIPS Support |
| --------- | ------------ |
| RHCOS nodes | FIPS mode via MachineConfig |
| Container images | Must use FIPS-validated crypto |
| OpenSSL | FIPS provider in OpenSSL 3.x |
| Go applications | `GODEBUG=fips140=1` (Go 1.21+) |

### OpenShift Secrets Management

| Method | Detection Pattern | Security Level |
| ------ | ----------------- | -------------- |
| Kubernetes Secrets | `kind: Secret` | Base64 only (not encrypted) |
| Sealed Secrets | `SealedSecret` | Encrypted at rest |
| External Secrets | `ExternalSecret` | External KMS integration |
| HashiCorp Vault | `vault.hashicorp.com` annotations | Enterprise |
| AWS Secrets Manager | `secretsmanager` in ExternalSecret | Cloud-native |

### OpenShift Service Mesh (Istio)

```bash
# mTLS configuration
grep -rn "PeerAuthentication\|mtls:" --include="*.yaml" .

# TLS settings
grep -rn "DestinationRule" --include="*.yaml" . | head -5
```

mTLS modes:

| Mode | Description |
| ---- | ----------- |
| STRICT | Enforce mTLS (recommended) |
| PERMISSIVE | Accept both TLS and plaintext |
| DISABLE | No mTLS |

### Document OpenShift Context

```markdown
## OpenShift Context

**Platform:** [Bare Metal / ROSA / ARO / GCP / Local]
**Version:** [4.x]
**FIPS Mode:** [Enabled / Disabled]

**Service Mesh:**
- Installed: [Yes/No]
- mTLS Mode: [STRICT/PERMISSIVE/DISABLE]

**Secrets Management:**
- Method: [K8s Secrets / Sealed Secrets / External Secrets / Vault]
- KMS Integration: [AWS / Azure / GCP / None]

**Certificate Management:**
- Method: [OpenShift serving certs / cert-manager / Manual]
- Rotation: [Automatic / Manual]
```

## Crypto Library Versions

### Go

```bash
# Check go.mod for crypto dependencies
grep -E "golang.org/x/crypto|crypto" go.mod
go list -m all | grep crypto
```

| Go Version | Crypto Notes |
| ---------- | ------------ |
| 1.21+ | FIPS 140-2 support via GODEBUG |
| 1.22+ | Improved TLS 1.3, X25519 |

### Python

```bash
# Check requirements
grep -iE "cryptography|pycryptodome|pyopenssl" requirements.txt pyproject.toml
pip show cryptography | grep Version
```

### Rust

```bash
# Check Cargo.toml
grep -E "ring|rustls|openssl" Cargo.toml
```

### Node.js

```bash
# Built-in crypto uses OpenSSL
node -e "console.log(process.versions.openssl)"
```

## Document Infrastructure Context

```markdown
## Infrastructure Context

**Runtime Environment:**
- Container: [Docker/Podman/None]
- Base Image: [image:tag]
- Orchestration: [Kubernetes/ECS/None]

**Crypto Infrastructure:**
- System Crypto: [OpenSSL X.X / LibreSSL / BoringSSL]
- FIPS Mode: [Enabled/Disabled/Unknown]
- Key Management: [AWS KMS / Vault / File-based / None]

**PQC Readiness:**
- [Constraints from infrastructure]
- [Available upgrade paths]
```

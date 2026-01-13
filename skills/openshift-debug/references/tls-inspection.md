# TLS Inspection

Debug TLS certificates, cipher suites, and secure communication on OpenShift.

## Route TLS

### Check Route TLS Configuration

```bash
oc get route <name> -n <namespace> -o yaml | grep -A15 tls:
```

| Termination | Description |
| ----------- | ----------- |
| edge | TLS terminates at router, plain HTTP to pod |
| passthrough | TLS passes through to pod |
| reencrypt | TLS terminates at router, new TLS to pod |

### Extract Certificate from Route

```bash
oc get route <name> -o jsonpath='{.spec.tls.certificate}' | openssl x509 -text -noout
```

### Check Default Ingress Certificate

```bash
oc get secret -n openshift-ingress router-certs-default -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout
```

## Service Certificates

### OpenShift Service CA

OpenShift auto-generates certs for services annotated with `service.beta.openshift.io/serving-cert-secret-name`.

```bash
oc get secret -n openshift-service-ca signing-key -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout
```

### Check Service Certificate

```bash
oc get secret <cert-secret> -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout
```

### Verify Certificate Chain

```bash
oc get secret <cert-secret> -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl verify -CAfile <ca-bundle>
```

## Certificate Details

### Key Information to Check

| Field | Command Fragment |
| ----- | ---------------- |
| Subject | `openssl x509 -subject -noout` |
| Issuer | `openssl x509 -issuer -noout` |
| Dates | `openssl x509 -dates -noout` |
| SANs | `openssl x509 -text -noout \| grep -A1 "Subject Alternative Name"` |
| Signature Alg | `openssl x509 -text -noout \| grep "Signature Algorithm"` |
| Public Key | `openssl x509 -text -noout \| grep -A2 "Public Key"` |

### Check Certificate Expiration

```bash
oc get secret <cert-secret> -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -enddate -noout
```

### Check All Certificates Expiring Soon

```bash
for secret in $(oc get secrets -A -o jsonpath='{range .items[?(@.type=="kubernetes.io/tls")]}{.metadata.namespace}/{.metadata.name}{"\n"}{end}'); do
  ns=$(echo $secret | cut -d/ -f1)
  name=$(echo $secret | cut -d/ -f2)
  expiry=$(oc get secret -n $ns $name -o jsonpath='{.data.tls\.crt}' 2>/dev/null | base64 -d | openssl x509 -enddate -noout 2>/dev/null | cut -d= -f2)
  if [ -n "$expiry" ]; then
    echo "$secret: $expiry"
  fi
done
```

## Live TLS Testing

### Test TLS Connection to Route

```bash
echo | openssl s_client -connect <route-hostname>:443 -servername <route-hostname> 2>/dev/null | openssl x509 -text -noout
```

### Check Cipher Suites

```bash
echo | openssl s_client -connect <route-hostname>:443 -servername <route-hostname> 2>/dev/null | grep -E "Cipher|Protocol"
```

### Check TLS Version

```bash
echo | openssl s_client -connect <route-hostname>:443 -tls1_3 2>&1 | grep -E "Protocol|error"
echo | openssl s_client -connect <route-hostname>:443 -tls1_2 2>&1 | grep -E "Protocol|error"
```

## Ingress Controller TLS

### Check Ingress Controller Config

```bash
oc get ingresscontroller default -n openshift-ingress-operator -o yaml | grep -A20 tlsSecurityProfile
```

### TLS Security Profiles

| Profile | Min TLS | Ciphers |
| ------- | ------- | ------- |
| Old | 1.0 | Legacy compatibility |
| Intermediate | 1.2 | Balanced (default) |
| Modern | 1.3 | TLS 1.3 only |
| Custom | Configurable | User-defined |

### Set TLS Profile

```bash
oc patch ingresscontroller default -n openshift-ingress-operator --type=merge -p '{"spec":{"tlsSecurityProfile":{"type":"Modern"}}}'
```

## API Server TLS

### Check API Server Certificates

```bash
oc get secret -n openshift-kube-apiserver apiserver-cert -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout
```

### Check API Server TLS Config

```bash
oc get kubeapiserver cluster -o yaml | grep -A10 tlsSecurityProfile
```

## Debugging mTLS

### Check if Service Uses mTLS

```bash
oc get pods -l <label> -o jsonpath='{.items[*].spec.containers[*].volumeMounts}' | jq -r '.[] | select(.name | contains("tls") or contains("cert"))'
```

### Service Mesh mTLS Status

```bash
oc get peerauthentication -A
oc get destinationrule -A -o yaml | grep -A5 "tls:"
```

# etcd Encryption at Rest

Verify and manage etcd encryption for secrets and other resources on OpenShift.

## Check Encryption Status

### API Server Encryption Config

```bash
oc get apiserver cluster -o jsonpath='{.spec.encryption}' | jq .
```

Expected output when enabled:

```json
{"type": "aescbc"}
```

Or for newer clusters:

```json
{"type": "aesgcm"}
```

### Verify Encryption is Active

```bash
oc get openshiftapiserver cluster -o jsonpath='{.status.conditions[?(@.type=="Encrypted")]}' | jq .
```

Look for `"status": "True"` and `"reason": "EncryptionCompleted"`.

### Check All Encryption Conditions

```bash
oc get kubeapiserver cluster -o jsonpath='{.status.conditions[?(@.type=="Encrypted")]}'
oc get openshiftapiserver cluster -o jsonpath='{.status.conditions[?(@.type=="Encrypted")]}'
oc get authentication cluster -o jsonpath='{.status.conditions[?(@.type=="Encrypted")]}'
```

## Encryption Types

| Type | Algorithm | Notes |
| ---- | --------- | ----- |
| identity | None | No encryption (default) |
| aescbc | AES-CBC | Legacy, 256-bit |
| aesgcm | AES-GCM | Recommended, authenticated encryption |
| secretbox | XSalsa20+Poly1305 | NaCl-based |

## Enabling Encryption

### Enable etcd Encryption

```bash
oc patch apiserver cluster --type=merge -p '{"spec":{"encryption":{"type":"aesgcm"}}}'
```

### Monitor Encryption Progress

```bash
watch 'oc get openshiftapiserver cluster -o jsonpath="{.status.conditions[?(@.type==\"Encrypted\")]}" | jq .'
```

Encryption is complete when:

- `type`: `Encrypted`
- `status`: `True`
- `reason`: `EncryptionCompleted`

### Check Migration Status

```bash
oc get kubeapiserver cluster -o jsonpath='{.status.conditions}' | jq '.[] | select(.type | contains("Encrypt"))'
```

## Encrypted Resources

By default, OpenShift encrypts:

| Resource | API Group |
| -------- | --------- |
| Secrets | core |
| ConfigMaps | core |
| Routes | route.openshift.io |
| OAuth access tokens | oauth.openshift.io |
| OAuth authorize tokens | oauth.openshift.io |

## Verify a Secret is Encrypted

You cannot directly verify encryption from the API (it's transparent). To verify etcd-level encryption:

### Check etcd Directly (requires etcd access)

```bash
oc rsh -n openshift-etcd etcd-<node>
etcdctl get /kubernetes.io/secrets/default/mysecret --prefix --keys-only
```

Encrypted data will show binary/encrypted content, not plaintext.

### Indirect Verification

1. Check encryption status is `EncryptionCompleted`
2. Create a test secret, verify API access works
3. Check etcd pod logs for encryption operations

## Troubleshooting

### Encryption Stuck

Check operator status:

```bash
oc get co kube-apiserver openshift-apiserver authentication
oc logs -n openshift-kube-apiserver-operator deploy/kube-apiserver-operator --tail=50
```

### Check Encryption Key Secrets

```bash
oc get secrets -n openshift-config-managed -l encryption.apiserver.operator.openshift.io/component
```

### Force Re-encryption

If keys need rotation:

```bash
oc patch apiserver cluster --type=merge -p '{"spec":{"encryption":{"type":"identity"}}}'
# Wait for decryption to complete
oc patch apiserver cluster --type=merge -p '{"spec":{"encryption":{"type":"aesgcm"}}}'
```

## Security Considerations

| Item | Recommendation |
| ---- | -------------- |
| Key rotation | Rotate by toggling encryption type |
| Backup encryption | Ensure etcd backups are also encrypted |
| FIPS mode | aesgcm uses FIPS-approved algorithms |
| Access control | Limit who can read encryption key secrets |

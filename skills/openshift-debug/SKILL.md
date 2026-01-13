---
name: openshift-debug
description: OpenShift debugging patterns - security, TLS, machine config, etcd encryption, cluster health
---

# OpenShift Debug

Debug security and infrastructure issues on OpenShift clusters.

## Quick Actions

Execute scripts from `scripts/` directory.

| Script | Purpose |
| ------ | ------- |
| `check-etcd-encryption.sh` | Verify etcd encryption at rest status |
| `inspect-route-cert.sh <route> [namespace]` | Extract and decode TLS cert from route |
| `deploy-test-workload.sh <namespace>` | Deploy nginx + postgres for testing |

## References

| File | Use When |
| ---- | -------- |
| `tls-inspection.md` | Debugging TLS, certs, cipher suites |
| `etcd-encryption.md` | Verifying encryption at rest |
| `machine-config.md` | Debugging MachineConfig, nodes, RHCOS |
| `cluster-health.md` | Checking operators, controllers, nodes |

## Common Debug Workflows

### TLS/Certificate Issues

1. Check route TLS termination: `oc get route <name> -o yaml | grep -A10 tls:`
2. Inspect cert: `./scripts/inspect-route-cert.sh <route>`
3. Check service CA: `oc get secret -n openshift-service-ca signing-key -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout`

Reference: `tls-inspection.md`

### etcd Encryption

1. Check status: `./scripts/check-etcd-encryption.sh`
2. If not encrypted, see `etcd-encryption.md#enabling-encryption`

### Machine Config Problems

1. Check pool status: `oc get mcp`
2. Check degraded nodes: `oc get nodes -o wide`
3. Check controller: `oc logs -n openshift-machine-config-operator deploy/machine-config-controller --tail=50`

Reference: `machine-config.md`

### Cluster Health

1. Check operators: `oc get co`
2. Check nodes: `oc get nodes && oc adm top nodes`
3. Check events: `oc get events --sort-by='.lastTimestamp' | tail -20`

Reference: `cluster-health.md`

## Platform Context

Always establish context first:

```bash
oc whoami && oc cluster-info && oc get clusterversion
```

### Cluster health snapshot

```bash
oc get co                           # Cluster operators
oc get nodes -o wide                # Node status
oc adm top nodes                    # Resource usage
oc get events -A --sort-by='.lastTimestamp' | tail -20
```

### MachineConfig snapshot

```bash
oc get mcp                          # Pool status
oc get mc --sort-by=.metadata.creationTimestamp
oc logs -n openshift-machine-config-operator deploy/machine-config-controller --tail=50
```

## Checklist

- Cluster operators healthy (`oc get co`)
- All nodes Ready (`oc get nodes`)
- etcd encryption enabled
- No degraded MachineConfigPools
- No warning events

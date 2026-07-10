# Cluster Health

Check overall cluster health, operators, nodes, and events on OpenShift.

## Cluster Overview

### Quick Health Check

```bash
oc get clusterversion
oc get co
oc get nodes
```

### Cluster Version Details

```bash
oc describe clusterversion version
```

Check for:

- Available updates
- Current version
- Upgrade history
- Conditions

## Cluster Operators

### List All Operators

```bash
oc get co
```

| Column | Healthy State |
| ------ | ------------- |
| AVAILABLE | True |
| PROGRESSING | False |
| DEGRADED | False |

### Check Degraded Operators

```bash
oc get co -o jsonpath='{range .items[*]}{.metadata.name}{"\t"}{.status.conditions[?(@.type=="Degraded")].status}{"\n"}{end}' | grep True
```

### Operator Details

```bash
oc describe co <operator-name>
```

### Operator Logs

Each operator has a namespace `openshift-<operator>-operator`:

```bash
oc logs -n openshift-kube-apiserver-operator deploy/kube-apiserver-operator --tail=50
oc logs -n openshift-authentication-operator deploy/authentication-operator --tail=50
```

## Node Health

### Node Status

```bash
oc get nodes -o wide
```

### Node Resource Usage

```bash
oc adm top nodes
```

### Node Conditions

```bash
oc get nodes -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{range .status.conditions[*]}  {.type}: {.status}{"\n"}{end}{"\n"}{end}'
```

Healthy node has:

- Ready: True
- MemoryPressure: False
- DiskPressure: False
- PIDPressure: False

### Node Details

```bash
oc describe node <node-name>
```

Check:

- Conditions
- Capacity vs Allocatable
- Non-terminated Pods
- Events

## Pod Health

### Pods Not Running

```bash
oc get pods -A --field-selector=status.phase!=Running,status.phase!=Succeeded
```

### Pods with Restarts

```bash
oc get pods -A -o jsonpath='{range .items[?(@.status.containerStatuses[*].restartCount>0)]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.status.containerStatuses[*].restartCount}{"\n"}{end}'
```

### CrashLoopBackOff Pods

```bash
oc get pods -A | grep -E "CrashLoop|Error|ImagePull"
```

## Events

### Recent Events

```bash
oc get events -A --sort-by='.lastTimestamp' | tail -30
```

### Warning Events

```bash
oc get events -A --field-selector type=Warning --sort-by='.lastTimestamp'
```

### Events for Specific Resource

```bash
oc get events -n <namespace> --field-selector involvedObject.name=<resource-name>
```

## Storage

### PVC Status

```bash
oc get pvc -A
```

### Check for Pending PVCs

```bash
oc get pvc -A --field-selector=status.phase=Pending
```

### Storage Classes

```bash
oc get sc
```

## Networking

### Check Cluster Network

```bash
oc get network.config cluster -o yaml
```

### DNS Status

```bash
oc get pods -n openshift-dns
oc logs -n openshift-dns -l dns.operator.openshift.io/daemonset-dns --tail=20
```

### Ingress Status

```bash
oc get ingresscontroller -n openshift-ingress-operator
oc get pods -n openshift-ingress
```

## API Server

### API Server Pods

```bash
oc get pods -n openshift-kube-apiserver -l apiserver=true
```

### API Server Logs

```bash
oc logs -n openshift-kube-apiserver -l apiserver=true --tail=50
```

### Check API Response Time

```bash
time oc get nodes > /dev/null
```

## etcd Health

### etcd Pods

```bash
oc get pods -n openshift-etcd -l etcd=true
```

### etcd Member List

```bash
oc rsh -n openshift-etcd etcd-<node-name> etcdctl member list -w table
```

### etcd Endpoint Health

```bash
oc rsh -n openshift-etcd etcd-<node-name> etcdctl endpoint health --cluster -w table
```

## Troubleshooting Checklist

1. **Operators**: `oc get co` - any degraded?
2. **Nodes**: `oc get nodes` - any NotReady?
3. **Pods**: `oc get pods -A | grep -v Running` - any stuck?
4. **Events**: `oc get events -A --field-selector type=Warning` - any warnings?
5. **Resources**: `oc adm top nodes` - any resource pressure?
6. **Logs**: Check operator/component logs for errors

## Must-Gather

For comprehensive debugging, collect must-gather:

```bash
oc adm must-gather
```

For specific components:

```bash
oc adm must-gather --image=registry.redhat.io/openshift4/ose-must-gather-rhel8:latest -- /usr/bin/gather_audit_logs
```

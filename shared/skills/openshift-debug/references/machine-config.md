# Machine Config Debugging

Debug MachineConfig, MachineConfigPool, and RHCOS node issues on OpenShift.

## MachineConfigPool Status

### Check Pool Status

```bash
oc get mcp
```

| Column | Meaning |
| ------ | ------- |
| UPDATED | All nodes have latest config |
| UPDATING | Nodes are applying new config |
| DEGRADED | Something is wrong |
| MACHINECOUNT | Total nodes in pool |
| READYMACHINECOUNT | Nodes ready |
| UPDATEDMACHINECOUNT | Nodes with latest config |

### Check Pool Details

```bash
oc describe mcp <pool-name>
```

Look for:

- `Conditions` section for errors
- `Configuration` for current/desired config

### Check Pool Conditions

```bash
oc get mcp <pool-name> -o jsonpath='{.status.conditions}' | jq .
```

## MachineConfig

### List MachineConfigs

```bash
oc get mc --sort-by=.metadata.creationTimestamp
```

### Check Rendered Config

Each pool has a rendered config combining all applicable MachineConfigs:

```bash
oc get mcp <pool-name> -o jsonpath='{.status.configuration.name}'
oc get mc <rendered-config-name> -o yaml
```

### View MachineConfig Contents

```bash
oc get mc <name> -o jsonpath='{.spec.config}' | jq .
```

### Decode File Contents

MachineConfig files are base64 encoded:

```bash
oc get mc <name> -o jsonpath='{.spec.config.storage.files[0].contents.source}' | sed 's/data:,//' | python3 -c "import sys, urllib.parse; print(urllib.parse.unquote(sys.stdin.read()))"
```

## Node Debugging

### Check Node Status

```bash
oc get nodes -o wide
oc describe node <node-name>
```

### Check Node Config State

```bash
oc get node <node-name> -o jsonpath='{.metadata.annotations.machineconfiguration\.openshift\.io/state}'
```

| State | Meaning |
| ----- | ------- |
| Done | Config applied |
| Working | Applying config |
| Degraded | Failed to apply |

### Check Current vs Desired Config

```bash
oc get node <node-name> -o jsonpath='{.metadata.annotations.machineconfiguration\.openshift\.io/currentConfig}'
oc get node <node-name> -o jsonpath='{.metadata.annotations.machineconfiguration\.openshift\.io/desiredConfig}'
```

### SSH to Node for Debugging

```bash
oc debug node/<node-name>
chroot /host
```

Once on node:

```bash
systemctl status kubelet
journalctl -u kubelet --tail=50
journalctl -u crio --tail=50
cat /etc/machine-config-daemon/currentconfig
```

## Machine Config Operator

### Check Operator Status

```bash
oc get co machine-config
```

### Check Controller Logs

```bash
oc logs -n openshift-machine-config-operator deploy/machine-config-controller --tail=100
```

### Check Daemon Logs on Node

```bash
oc logs -n openshift-machine-config-operator -l k8s-app=machine-config-daemon --tail=50
```

Or from debug pod:

```bash
oc debug node/<node-name>
chroot /host
journalctl -u machine-config-daemon-host --tail=100
```

## Common Issues

### Pool Degraded

1. Check which node is degraded:

   ```bash
   oc get nodes -o custom-columns=NAME:.metadata.name,STATE:.metadata.annotations."machineconfiguration\.openshift\.io/state"
   ```

2. Check daemon logs on that node:

   ```bash
   oc logs -n openshift-machine-config-operator -l k8s-app=machine-config-daemon -c machine-config-daemon | grep -i error
   ```

### Config Not Applying

1. Check if config is rendered:

   ```bash
   oc get mcp <pool> -o jsonpath='{.status.configuration.name}'
   ```

2. Check daemon status:

   ```bash
   oc get pods -n openshift-machine-config-operator -l k8s-app=machine-config-daemon
   ```

### Node Stuck Rebooting

Check if drain is blocked:

```bash
oc adm drain <node> --dry-run=client
oc get pods -A --field-selector spec.nodeName=<node> | grep -v Completed
```

## FIPS Mode

### Check if FIPS Enabled

```bash
oc debug node/<node-name> -- chroot /host fips-mode-setup --check
```

Or:

```bash
oc debug node/<node-name> -- chroot /host cat /proc/sys/crypto/fips_enabled
```

### FIPS MachineConfig

FIPS is set at install time. Check for FIPS kernel args:

```bash
oc get mc -o yaml | grep -i fips
```

## Creating MachineConfigs

### Structure

```yaml
apiVersion: machineconfiguration.openshift.io/v1
kind: MachineConfig
metadata:
  labels:
    machineconfiguration.openshift.io/role: worker
  name: 99-worker-custom
spec:
  config:
    ignition:
      version: 3.2.0
    storage:
      files:
        - path: /etc/myconfig
          mode: 0644
          contents:
            source: data:,mycontent
```

### Apply and Monitor

```bash
oc apply -f machineconfig.yaml
watch oc get mcp
```

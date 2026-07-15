---
name: openshift-debug
description: Debug OpenShift clusters (TLS, etcd encryption, machine config, health) using openshift-debug skill.
model: haiku
readonly: true
---

# OpenShift debug

1. Read and follow the `openshift-debug` skill: establish `oc` context, then use references and scripts under `skills/openshift-debug/`.
2. Narrow the problem domain (TLS, etcd, MachineConfig, or general health) and use the matching reference doc and `oc` snapshots from the skill.
3. Prefer read-only inspection first; only suggest mutating commands or scripts when the user confirms they want to change cluster state.

If the skill path is unavailable in context, use `skills/openshift-debug/` and scripts in `skills/openshift-debug/scripts/`.

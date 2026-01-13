#!/bin/bash
set -e

echo "=== etcd Encryption Status ==="
echo

encryption_type=$(oc get apiserver cluster -o jsonpath='{.spec.encryption.type}' 2>/dev/null || echo "not set")
echo "Encryption type: $encryption_type"
echo

echo "=== API Server Encryption Status ==="
oc get kubeapiserver cluster -o jsonpath='{.status.conditions[?(@.type=="Encrypted")]}' 2>/dev/null | jq . || echo "No encryption condition found"
echo

echo "=== OpenShift API Server Encryption Status ==="
oc get openshiftapiserver cluster -o jsonpath='{.status.conditions[?(@.type=="Encrypted")]}' 2>/dev/null | jq . || echo "No encryption condition found"
echo

echo "=== Authentication Encryption Status ==="
oc get authentication cluster -o jsonpath='{.status.conditions[?(@.type=="Encrypted")]}' 2>/dev/null | jq . || echo "No encryption condition found"

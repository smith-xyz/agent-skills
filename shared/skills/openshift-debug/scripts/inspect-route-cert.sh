#!/bin/bash
set -e

ROUTE=${1:?Usage: inspect-route-cert.sh <route-name> [namespace]}
NAMESPACE=${2:-$(oc project -q)}

echo "=== Route: $ROUTE in namespace: $NAMESPACE ==="
echo

termination=$(oc get route "$ROUTE" -n "$NAMESPACE" -o jsonpath='{.spec.tls.termination}' 2>/dev/null)
echo "TLS Termination: ${termination:-none}"

if [ -z "$termination" ]; then
    echo "Route does not have TLS configured"
    exit 0
fi

echo
echo "=== Route TLS Configuration ==="
oc get route "$ROUTE" -n "$NAMESPACE" -o jsonpath='{.spec.tls}' | jq .

echo
echo "=== Certificate Details ==="
cert=$(oc get route "$ROUTE" -n "$NAMESPACE" -o jsonpath='{.spec.tls.certificate}' 2>/dev/null)

if [ -n "$cert" ]; then
    echo "$cert" | openssl x509 -text -noout
else
    echo "No custom certificate - using default ingress certificate"
    echo
    echo "=== Default Ingress Certificate ==="
    oc get secret -n openshift-ingress router-certs-default -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -text -noout
fi

echo
echo "=== Live TLS Check ==="
host=$(oc get route "$ROUTE" -n "$NAMESPACE" -o jsonpath='{.spec.host}')
echo "Connecting to: $host"
echo | openssl s_client -connect "$host":443 -servername "$host" 2>/dev/null | grep -E "subject=|issuer=|Protocol|Cipher"

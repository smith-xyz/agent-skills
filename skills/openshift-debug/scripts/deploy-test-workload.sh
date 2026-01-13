#!/bin/bash
set -e

NAMESPACE=${1:?Usage: deploy-test-workload.sh <namespace>}

echo "=== Deploying test workload to namespace: $NAMESPACE ==="
echo

oc create namespace "$NAMESPACE" --dry-run=client -o yaml | oc apply -f -

echo "Deploying PostgreSQL..."
oc apply -n "$NAMESPACE" -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: registry.redhat.io/rhel8/postgresql-13:latest
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRESQL_USER
          value: testuser
        - name: POSTGRESQL_PASSWORD
          value: testpass
        - name: POSTGRESQL_DATABASE
          value: testdb
---
apiVersion: v1
kind: Service
metadata:
  name: postgres
spec:
  selector:
    app: postgres
  ports:
  - port: 5432
    targetPort: 5432
EOF

echo "Deploying nginx..."
oc apply -n "$NAMESPACE" -f - <<EOF
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx
spec:
  replicas: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: registry.access.redhat.com/ubi8/nginx-120:latest
        ports:
        - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: nginx
spec:
  selector:
    app: nginx
  ports:
  - port: 8080
    targetPort: 8080
EOF

echo "Creating route with edge TLS..."
oc expose service nginx -n "$NAMESPACE" --dry-run=client -o yaml | oc apply -n "$NAMESPACE" -f -
oc patch route nginx -n "$NAMESPACE" -p '{"spec":{"tls":{"termination":"edge","insecureEdgeTerminationPolicy":"Redirect"}}}'

echo
echo "=== Deployment Status ==="
oc get pods,svc,route -n "$NAMESPACE"

echo
echo "=== Route URL ==="
oc get route nginx -n "$NAMESPACE" -o jsonpath='https://{.spec.host}{"\n"}'

# DCM, MongoDB and Keycloak Helm charts

This archive contains three independent Helm charts:

- `mongodb/`: MongoDB 7.0 for DCM persistence
- `dcm/`: FACIS DCM `v2.1`
- `keycloak/`: Keycloak using the requested Bitnami Legacy image and an external PostgreSQL database

No chart installs either of the other services.

## Required deployment values

Most entries in each `values.yaml` are optional defaults. Only the following operational values must be supplied when not using existing Secrets.

### MongoDB

```yaml
secret:
  rootPassword: "<strong-root-password>"
  password: "<strong-dcm-password>"
```

### DCM

```yaml
secret:
  dcmKmsKey: "<output-of-openssl-rand-hex-32>"
  mongoUri: "mongodb://dcm:<url-encoded-password>@mongodb:27017/dcm?authSource=dcm"
```

The DCM MongoDB password must match `mongodb.secret.password`.

### Keycloak

```yaml
secret:
  adminPassword: "<strong-keycloak-admin-password>"
  database:
    password: "<strong-postgresql-password>"

database:
  host: postgresql
```

The PostgreSQL database, user and password must already exist. Keycloak cannot use MongoDB as its database.

## Deployment order

```bash
helm upgrade --install mongodb ./mongodb \
  --namespace dcm --create-namespace \
  --values mongodb-values.yaml

kubectl rollout status statefulset/mongodb -n dcm --timeout=5m

helm upgrade --install dcm ./dcm \
  --namespace dcm \
  --values dcm-values.yaml

kubectl rollout status deployment/dcm -n dcm --timeout=5m

helm upgrade --install keycloak ./keycloak \
  --namespace dcm \
  --values keycloak-values.yaml

kubectl rollout status statefulset/keycloak -n dcm --timeout=10m
```

Resource names can differ when release names or `fullnameOverride` values differ.

## Verification

```bash
kubectl get pods,svc,ingress,pvc -n dcm
kubectl logs -n dcm statefulset/mongodb
kubectl logs -n dcm deployment/dcm
kubectl logs -n dcm statefulset/keycloak
```

## Existing Secrets

Each chart supports `secret.existingSecret`. When used, the chart skips Secret creation and expects the exact keys documented in that chart's `values.yaml`.

## Important lifecycle notes

- MongoDB initialization scripts run only against a new, empty data directory.
- Changing MongoDB passwords in Helm values does not rotate users inside an existing database.
- Uninstalling a StatefulSet release does not necessarily delete its PVC. Inspect PVCs before manual deletion.
- The requested `bitnamilegacy/keycloak` image is legacy; mirror it into a controlled registry for a durable deployment path.

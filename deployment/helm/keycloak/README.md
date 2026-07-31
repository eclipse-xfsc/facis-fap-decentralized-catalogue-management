# Keycloak Helm chart

Deploys only `bitnamilegacy/keycloak:26.3.3-debian-12-r0`. PostgreSQL is external to this chart.

## Required values

When `secret.existingSecret` is empty, provide:

```yaml
secret:
  adminPassword: "<strong-keycloak-admin-password>"
  database:
    password: "<strong-postgresql-password>"

database:
  host: postgresql
```

The defaults use the `admin` Keycloak administrator and the `keycloak` PostgreSQL user/database.

The chart intentionally does not create a Keycloak PVC. Durable Keycloak state belongs in PostgreSQL. For ingress deployments, the chart sets native `KC_PROXY_HEADERS` and derives `KC_HOSTNAME` from `ingress.host` unless `hostname` is explicitly supplied.

```bash
helm upgrade --install keycloak ./keycloak \
  --namespace dcm --create-namespace \
  --values ./keycloak-values.yaml
```

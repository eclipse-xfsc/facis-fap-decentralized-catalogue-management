# MongoDB Helm chart

Deploys a standalone MongoDB 7.0 StatefulSet and creates a dedicated DCM database user during first initialization.

## Required values

When `secret.existingSecret` is empty, only the two passwords must be supplied:

```yaml
secret:
  rootPassword: "<strong-root-password>"
  password: "<strong-dcm-password>"
```

The default application user and database are both suitable for DCM:

```yaml
secret:
  username: dcm
  database: dcm
```

```bash
helm upgrade --install mongodb ./mongodb \
  --namespace dcm --create-namespace \
  --values ./mongodb-values.yaml
```

The initialization script runs only when `/data/db` is empty. Changing values later does not rotate users in an existing database.

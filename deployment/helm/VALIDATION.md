# Validation report

## Result

PASS

## Changes validated

- DCM image pinned to `ecofacis/fap-dcm:latest`.
- MongoDB image updated to `mongo:7.0`.
- Empty required credentials fail rendering unless `secret.existingSecret` is set.
- Placeholder passwords are rejected.
- An all-zero DCM KMS key is rejected.
- DCM MongoDB URI must use `mongodb://` or `mongodb+srv://`.
- Keycloak no longer creates or mounts a PVC.
- Keycloak sets reverse-proxy variables for ingress deployments.
- Keycloak derives `KC_HOSTNAME` from the ingress hostname when needed.
- Keycloak disables strict hostname mode for local non-ingress startup when no hostname is supplied.
- Example ingress hostnames are rejected when ingress is enabled.
- All charts render without creating their own Secret when `secret.existingSecret` is configured.

## Test matrix

Positive cases:

- MongoDB with minimal inline credentials
- DCM with minimal KMS key and MongoDB URI
- Keycloak with minimal administrator and PostgreSQL credentials
- All three charts using external Secrets
- DCM application and FileBrowser ingresses enabled
- Keycloak ingress with TLS and automatically derived hostname

Negative cases:

- Empty DCM KMS key
- All-zero DCM KMS key
- Placeholder DCM MongoDB URI
- Empty MongoDB passwords
- Placeholder MongoDB password
- Empty Keycloak administrator password
- Placeholder Keycloak database password
- Keycloak ingress using the default example hostname

Structural checks:

- Rendered documents parse as YAML.
- Workload image references match the intended pinned versions.
- Service selectors match pod labels.
- StatefulSet governing services exist.
- Keycloak contains no `volumeClaimTemplates` or data volume mount.
- Keycloak ingress rendering contains `KC_PROXY_HEADERS` and `KC_HOSTNAME`.

## Validation method

The environment did not contain the Helm CLI and could not resolve external package hosts. Templates were therefore executed with a Go `text/template` validation harness implementing the Helm/Sprig functions used by these charts, followed by YAML parsing and cross-resource assertions.

Run the following in an environment with Helm before cluster deployment:

```bash
helm lint ./mongodb -f mongodb-values.yaml
helm lint ./dcm -f dcm-values.yaml
helm lint ./keycloak -f keycloak-values.yaml

helm template mongodb ./mongodb -f mongodb-values.yaml >/tmp/mongodb.yaml
helm template dcm ./dcm -f dcm-values.yaml >/tmp/dcm.yaml
helm template keycloak ./keycloak -f keycloak-values.yaml >/tmp/keycloak.yaml
```

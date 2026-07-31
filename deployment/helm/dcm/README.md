# DCM Helm chart

Deploys `ecofacis/fap-dcm:latest`. MongoDB is external to this chart.

## Required values

When `secret.existingSecret` is empty, provide:

```yaml
secret:
  dcmKmsKey: "<64-hex-character-key>"
  mongoUri: "mongodb://dcm:<url-encoded-password>@mongodb:27017/dcm?authSource=dcm"
```

Generate the KMS key with:

```bash
openssl rand -hex 32
```

Alternatively, set `secret.existingSecret` to a Secret containing the keys `dcm-kms-key` and `mongo-uri`.

```bash
helm upgrade --install dcm ./dcm \
  --namespace dcm --create-namespace \
  --values ./dcm-values.yaml
```

## Availability contract

Startup, readiness and liveness probes use HTTP `GET /healthz` on the named `app` port. The default rolling-update strategy uses `maxUnavailable: 0` and `maxSurge: 1` so the existing ready pod remains available until the replacement is ready.

## Autoscaling

Autoscaling is disabled by default. Enable the `autoscaling` block to render an `autoscaling/v2` HorizontalPodAutoscaler:

```yaml
autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 5
  targetCPUUtilizationPercentage: 75
```

CPU and memory requests must remain configured when utilization-based autoscaling is enabled.

# NF10 acceptance matrix

| Area | Automated evidence | BDD evidence | Pass condition |
|---|---|---|---|
| Frontend build | `npm run build` | All UI scenarios depend on a deployable build | Build exits successfully |
| ORCE integrity | `flow-structure.test.mjs` | Harvest and transformation features | JSON parses, IDs are unique and wires resolve |
| Route contract | Static `/healthz` graph check and deployed smoke test | Operational smoke feature | One wired route, HTTP 200 and correct JSON |
| Security | `security.test.mjs` and `npm audit` | Authentication/RBAC feature | No high-confidence committed secrets or high production vulnerabilities |
| Authentication/RBAC | Initially formal BDD evidence; automate with isolated test accounts in the next CI increment | `01_authentication_rbac.feature` | Positive, negative and permission-denial scenarios pass |
| Harvest protocols | Deployed smoke remains separate from destructive E2E runs | `02_catalogue_harvest.feature` | OAI-PMH, SPARQL, failure and validation scenarios pass |
| Transformation | Static flow integrity plus controlled E2E evidence | `03_transformation_audit.feature` | Mapping, versioning and audit scenarios pass |
| Operations | `deployment-smoke.test.mjs` | `04_operational_smoke.feature` | UI, liveness, readiness and monitoring pass |
| CI operation | `.github/workflows/ci.yml` | All features retained in repository | Required jobs run automatically and retain logs |

## Important boundary

This package provides executable build/static/security/deployment tests and the complete Gherkin acceptance catalogue. Database tampering, rolling deployment and full harvest/transformation scenarios must run only in an isolated test environment. They should not be executed against production from an ordinary pull-request pipeline.


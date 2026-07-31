# Live UI test results — 2026-07-29

Target: FACIS DCM Leanea deployment.

## Passed

- Catalogue Registry exposed catalogue, asset-type and API-mapping management.
- A public JSON endpoint passed `Test connection` as a verified JSON result.
- The Harvest Wizard retained catalogue, scope and lifecycle choices through its overview.
- Local Catalogue exact search for `Q42` returned one matching active asset.
- Local Catalogue filters could be cleared and Provenance was accessible.
- Schema Registry exposed local schemas, remote schemas, mappings, prompts, LLM configurations, prompt testing, providers and audit trail.
- Audit integrity verified 1,005 chained records; 50 legacy records were reported separately.
- Monitoring loaded current counters, six explicit module statuses and recent audit events.

## Failed or blocked

### AI-driven catalogue registration

The public REST endpoint `https://jsonplaceholder.typicode.com/posts` passed connection testing. With ID field `id`, name field `title`, type field `userId`, and transformation strategy `AI-driven`, registration failed with only:

`Catalogue configuration is invalid.`

The UI did not identify the missing AI mapping dependency or invalid field. No catalogue record was created.

### DCAT regression

Harvesting the existing public deterministic DCAT catalogue `NF6 Final E2E 20260727-0750` failed because the remote server returned Turtle with HTTP content type `text/plain`. The UI truthfully reported the endpoint and content type, but this source had succeeded previously.

### Query-interface regression

Harvesting the existing `API Cat` catalogue failed with:

- `Login failed (HTTP 404)`
- `HTTP 404 from https://tc.facis.cloud/service/api/catalogue`

The catalogue is displayed with authentication/strategy `none`, so the login attempt requires configuration review.

## Interpretation

The UI surface is broad enough for a comprehensive NF10 BDD suite, but the live deployment does not currently pass every new scenario. These findings are product regressions or validation gaps, not failures in the Gherkin package.


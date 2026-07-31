# Known first-run findings

The package was validated against the repository snapshot dated 23-24 July 2026.

Passing checks:

- all flow files contain valid JSON arrays;
- assembled flow node IDs are unique;
- all assembled wire targets resolve;
- no high-confidence committed secret was detected;
- all 16 BDD scenarios satisfy the feature contract;
- deployed `/healthz`, OpenAPI and UI smoke tests pass.

Expected failures before the current live flow is exported back to the repository:

1. `GET /healthz` is live but is not present in the repository snapshot’s `full_assembled_out_flow.json`.
2. The assembled flow contains duplicate HTTP routes for:
   - `GET /.well-known/api-catalog`
   - `GET /api/openapi.json`

DevOps/development should export the current deployed ORCE flows, keep only one implementation of each duplicated route, regenerate the assembled flow and rerun:

```bash
npm run test:static
```

The CI job should remain red until these repository/runtime differences are resolved.


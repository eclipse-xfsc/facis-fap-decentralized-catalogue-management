# NF10 CI and BDD handoff package

This package is designed for the FACIS FAP DCM repository. It addresses the NF10 finding that the repository had no automated tests and no GitHub Actions workflow.

## What to copy into the repository

Copy these folders into the repository root:

- `.github/workflows/ci.yml`
- `features/`
- `tests/`

Merge the scripts from `package-scripts.json` into the existing `package.json`.

## One-time setup

The current repository has no lockfile. After merging the files:

```bash
npm install
git add package-lock.json
```

Commit the generated `package-lock.json`. The workflow deliberately uses `npm ci`, so dependency installation is deterministic.

## GitHub configuration

Create these repository variables:

- `DCM_BASE_URL`: deployment base URL ending in `/`, for example `https://orce.leanea.com/fur-segment-zas9v0zm-ly02/`
- `DCM_READINESS_PATH`: readiness path, normally `readyz`
- `REQUIRE_READINESS`: set to `1` when the readiness endpoint is implemented

No application password or API key is required by the included smoke suite.

## Test layers

1. `npm run build` verifies that the frontend compiles.
2. `npm run test:static` validates ORCE flow structure, HTTP route wiring, obvious committed secrets and the Gherkin feature contract.
3. `npm run test:integration` checks the deployed UI, `/healthz`, OpenAPI and optionally `/readyz`.
4. The 16 domain files in `features/` define the expanded BDD acceptance suite across every functional area exposed by the current UI. Scenarios tagged `@manual-db` or `@manual-infra` require a controlled test environment and are not executed automatically by this initial pipeline.

## Test data

See `PUBLIC_TEST_DATA.md`. Feature files use synthetic identifiers, reserved example domains and public endpoints. Provider credentials must come from CI secret storage and must never be committed.

## Live UI findings

See `LIVE_UI_TEST_RESULTS_2026-07-29.md` for the behavior verified on the Leanea deployment and the regressions found during the expanded walkthrough.

## NF10 pass rule

NF10 should be marked complete only when:

- the workflow runs automatically on pull requests and pushes;
- build, static, security and deployed smoke jobs pass;
- test logs are retained as workflow artifacts;
- the BDD scenarios have named owners and evidence;
- no live-environment job silently skips because `DCM_BASE_URL` is missing;
- the repository’s contractual owner confirms that TDR item 9 is binding.

## Recommended branch protection

Require the `build-static-security` job on pull requests. Require `deployed-smoke` before promoting a release to the target environment.

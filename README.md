# FACIS DCM

Decentralized Catalogue Management (DCM) provides a browser UI and six XFSC-ORCE modules for registering remote catalogues, harvesting assets, transforming records, validating RDF, browsing a shared local catalogue, and administering access.

This README describes the implementation in this repository and the UI deployed For DCM Project


Runtime observations in this document were last checked on 2026-07-29. A successful test in one deployment is evidence for that deployment at that time; it is not a substitute for testing a new release.

## 1. Repository layout

| Path | Purpose |
|---|---|
| `src/` | Vue UI source |
| `backend/src/base_flow.json` | Public discovery and health endpoints |
| `backend/src/M1_DCM-SchemaRegistry_flow.json` | Schema Registry, prompts, providers, mappings, transformation audit |
| `backend/src/M2_DCM-CatalogueRegistry_flow.json` | Remote catalogues, asset types, API mappings |
| `backend/src/M3_DCM-Harvester_flow.json` | Protocol execution, transformation, harvest lifecycle |
| `backend/src/M4_DCM-AdminTools_flow.json` | Administration, monitoring, audit |
| `backend/src/M5_DCM-LocalCatalogue_flow.json` | Local Catalogue and provenance |
| `backend/src/M6_DCM-Auth_flow.json` | Keycloak/OIDC authentication and session handling |
| `backend/src/full_assembled_out_flow.json` | Assembled XFSC-ORCE deployment flow |
| `backend/test/` | Automated regression tests |
| `docs/examples/` | Non-secret example data and schemas |
| `deployment/helm/` | Kubernetes Helm chart |

## 2. Runtime architecture

The UI communicates with the XFSC-ORCE backend over the uibuilder channel. MongoDB stores catalogue, schema, harvest, session, and audit data. Keycloak is the identity and role source.

The six application areas visible in the current UI are:

1. Local Catalogue
2. Catalogue Registry
3. Schema Registry
4. Admin Tools
5. Harvest Catalogues
6. Sign Out and the user profile menu

The Schema Registry currently exposes these tabs:

- Local Schema
- Remote Schema
- Mapping
- Prompts
- LLM Config
- Prompt Testing
- Providers
- Audit Trail

## 3. Authentication and authorization

The current implementation uses Keycloak/OIDC. It does not authenticate users against a local password collection.

At login, the XFSC-ORCE authentication module:

1. requests a Keycloak token;
2. validates the identity and user state;
3. reads Keycloak realm roles and FACIS access-area roles;
4. derives UI access areas and permissions;
5. creates a server-side record in `auth_sessions`.

The standard access areas are:

- `localCatalogue`
- `catalogueRegistry`
- `schemaRegistry`
- `adminTools`
- `harvest`

The Local Catalogue is a shared catalogue view. Access control limits functionality and UI areas; it is not documented or implemented here as per-user row ownership.

Do not publish example administrator passwords in project documentation. Obtain test credentials from the environment owner.

## 4. Public endpoints

The base URL is deployment-specific.

| Method and path | Purpose |
|---|---|
| `GET /healthz` | Process liveness only |
| `GET /.well-known/api-catalog` | API discovery linkset |
| `GET /api/openapi.json` | OpenAPI document |
| `GET /ui/` | DCM browser UI |

`/healthz` returns:

```json
{
  "status": "ok",
  "service": "facis-dcm",
  "timestamp": "2026-07-29T00:00:00.000Z",
  "uptimeSeconds": 123
}
```

The health response intentionally does not contact MongoDB, Keycloak, or a remote catalogue. Use infrastructure probes and the Admin Tools monitoring view for deeper checks.

API catalogue discovery follows RFC 9727. The linkset response format is described by RFC 9264.

## 5. Build and automated tests

Requirements:

- Node.js 20 or newer
- npm

Install and build:

```bash
npm install
npm run build
```

Run the repository tests with an explicit test-file glob:

```bash
node --test "backend/test/*.test.mjs"
```

The test suite is under `backend/test/`. The current `package.json` test script passes a directory to the Node test runner and is not portable; use the command above until that script is corrected.

Some tests import `n3`, `rdf-ext`, and `rdf-validate-shacl`; run `npm install` before the suite. Live network scenarios are opt-in and must not be confused with the default isolated tests.

The Helm chart currently defaults to the image repository `ecofacis/fap-dcm` and tag `latest`. Treat the chart or the release manifest as the source of truth for the deployed image tag. Do not copy an unverified image tag from an old guide.

## 6. Catalogue Registry

### 6.1 Register Remote Catalogue

The current form contains:

- Catalogue ID
- Catalogue Name
- Owner / Contact
- Protocol
- Access URL / Base Endpoint
- protocol-specific settings
- optional Import from JSON File
- optional Schema Mapping
- Authentication
- optional Response Mapping
- Advanced settings
- Test connection

Supported protocol choices in the UI are:

| Protocol | Important settings |
|---|---|
| Query interface | Query endpoint, query language, method, result MIME type |
| DCAT | DCAT catalogue URI or endpoint and RDF content negotiation |
| OAI-PMH | Base endpoint, metadata prefix, optional set |

SPARQL is a Query interface language. It is not a fourth protocol.

Supported authentication choices shown by the UI are None, Token Login, Bearer Token, API Key, OAuth2, and mTLS. Availability in the form does not prove that every connection-test path is implemented. The current backend explicitly reports OAuth2 connection testing as unsupported.

The Response Mapping fields are:

- Response Root Path
- Asset ID Field
- Asset Name Field
- Asset Type Field

Use Test connection before saving. Registration validation requires a valid absolute HTTP(S) endpoint for network-backed catalogues.

### 6.2 Asset Types

Asset Types associate a remote catalogue with the type of assets that can be harvested. An asset type can reference a Remote Schema.

### 6.3 API Mappings

API Mappings define how a Query interface is called and how its response is interpreted. Avoid putting the same path in both the base endpoint and the mapping path.

For CKAN, one valid pattern is:

- Base or query endpoint: `https://demo.ckan.org/api/3/action/package_search`
- Method: `GET`
- Result MIME type: `application/json`
- Response root: `result.results`
- Asset ID field: `id`
- Asset name field: `title`

The live environment contains successful historical CKAN runs, but public demo data can change. Re-run Test connection and a harvest in the target release.

## 7. Harvest Catalogues

Select New Harvest to open the four-step wizard:

1. Select Catalogues
2. Harvest Scope
3. Lifecycle & Mapping
4. Overview

The wizard exposes optional Schema Mapping and cross-catalogue reference resolution. Schema Mapping is not assumed to be enabled; confirm the Overview before starting.

The run view reports processed, success, error, imported, and completion values. A harvest is accepted only when:

- the run has a terminal status;
- the imported/error counts are credible;
- the new asset is visible in Local Catalogue;
- the Audit Trail contains the expected strategy and identifiers when transformation is enabled.

An empty result is not automatically success. A network error, invalid configuration, malformed payload, unsupported response, or transformation failure must be visible as a failed or partial run.

### 7.1 Protocol execution verified in the  environment

| Path | Runtime evidence |
|---|---|
| Query interface, REST/JSON | CKAN historical runs imported records |
| Query interface, SPARQL | `NF2 SPARQL QA 20260728 R2` completed with 2 imports |
| OAI-PMH | `NF2 OAI QA 20260728 R2` completed with 1,000 imports |
| DCAT/RDF | `NF6 RDF Test 2026-07-27` completed on 2026-07-29 with 1 import, 0 errors |

These are evidence records, not reusable catalogue IDs for another environment.

## 8. Schema Registry and transformations

### 8.1 Schemas

Local Schema stores the canonical target definition and its versions. Remote Schema stores the source definition associated with remote catalogues.

The example files are:

- `docs/examples/local-schema.dcat-dataset.json`
- `docs/examples/remote-schema.facis-cloud.json`
- `docs/examples/diamant-cloud.json`

The two schema files use different schema conventions: the local file is JSON Schema; the FACIS remote file is a field-description document. Do not claim that uploading either file alone performs a transformation.

### 8.2 Mapping strategies

The Mapping table in the current UI shows these transformation types:

| UI label | Runtime meaning |
|---|---|
| JSON Field Mapping | Explicit source-to-target field rules |
| Deterministic RDF | RDF parsing, namespace filtering, optional SHACL validation |
| AI-driven | Prompt and provider based transformation |
| Hybrid AI Mapping | Hybrid path configured on a mapping; evidence must show whether AI or fallback was used |

The catalogue form also offers None, which means no schema transformation.

Do not treat a successful harvest as proof that its requested transformation ran. Check the Audit Trail Strategy column and Details.

### 8.3 Deterministic RDF

A deterministic RDF mapping can:

- parse supported RDF formats;
- retain configured predicate namespaces;
- discard other predicates;
- serialize the retained graph;
- validate against linked SHACL shapes.

The live NF6 verification used the public Turtle sample:

`https://raw.githubusercontent.com/SEMICeu/dcat-ap_validator/refs/heads/master/pages/samples/sample-turtle.ttl`

The successful 2026-07-29 run produced:

- 1 imported asset;
- 64 parsed statements;
- 63 retained statements;
- 1 discarded statement;
- SHACL `valid: true`;
- an Audit Trail record with strategy `rdf` and validation `pass`.

A separate negative sample without a required title produced an Invalid result with a SHACL message, result path, and focus node.

### 8.4 Prompts

Schema-mapping prompts support:

- `{SOURCE_ASSET}` - required for a real source record
- `{SOURCE_SCHEMA}`
- `{TARGET_SCHEMA}`
- `{EXAMPLES}`
- `{CONSTRAINTS}`

Prompt metadata includes name, version, status, author, source schema, target schema, template, examples, constraints, and provider selection. Versions are immutable records; editing to a new version must preserve the previous version.

Prompt Testing is a separate tab. Use it to validate a selected prompt/provider combination before attaching the prompt to an AI-driven mapping.

### 8.5 Providers and the current AI limitation

Provider API keys are entered under Schema Registry > Providers and are never displayed back to the UI. The provider list exposes only whether a key is set.

On 2026-07-29 the UI showed:

- one active OpenAI provider named `GPT`;
- endpoint `https://api.openai.com/v1/chat/completions`;
- key set;
- model `gpt-4o`;
- a newly registered CKAN Remote Schema and DCAT JSON Local Schema;
- a new active prompt named `Guide CKAN to DCAT 20260729` with generated code;
- a successful Prompt Testing result using OpenAI / `gpt-4o`;
- a mapping that retained its explicit Linked Prompt when reopened.

The end-to-end AI harvest still failed its transformation acceptance check. Selecting AI-driven in the catalogue form did not reveal the required Prompt ID, LLM Config ID, or Provider Override controls, and Save returned `Catalogue configuration is invalid`. The bounded harvest imported one source record but Overview showed `0 AI-driven`; saved evidence showed strategy `none` and no prompt/provider identifiers.

Hybrid failed the same acceptance check. The mapping retained Hybrid and the linked prompt, but the catalogue could not be saved as Hybrid because its required AI configuration controls were absent. The bounded import showed `0 Hybrid`, strategy `none`, and no fallback evidence.

Therefore neither successful import is an AI or Hybrid transformation PASS. The detailed fields, values, evidence, and retest conditions are in the Getting Started guide.

## 9. Local Catalogue

Local Catalogue provides the shared harvested view. The current UI supports:

- free-text search;
- filters for catalogue, type, domain, and integration status;
- View, Archive, and Delete actions;
- CSV export;
- a Provenance tab.

After a fresh login or UI refresh, the table can temporarily show zero assets while data is loading. Navigate to another module and back, or refresh once, before reporting an empty catalogue as a defect.

## 10. Audit evidence

Schema Registry > Audit Trail contains:

- sequence;
- start time;
- remote and local asset identifiers;
- raw catalogue ID and catalogue name;
- strategy;
- prompt version or namespaces;
- status and duration;
- validation;
- integrity state;
- record hash;
- Details.

New protected records are hash chained. Verify Integrity distinguishes protected records from legacy/unverified rows. CSV and JSON exports include raw identifiers and hash-chain fields.

For a successful transformed harvest, confirm that catalogue ID and both asset identifiers are present. A record missing a required identifier must not remain a success.

## 11. Admin Tools

Admin Tools is permission-controlled. Users and roles are backed by Keycloak. The application keeps only its server-side session and audit records in MongoDB.

Do not document local password hashing or local user/role collections for this version.

## 12. MongoDB collections

The following names are referenced by the current modular XFSC-ORCE flow sources. This list replaces the previous speculative collection table.

| Collection | Purpose |
|---|---|
| `auth_sessions` | Server-side DCM sessions created after Keycloak authentication |
| `cr_api_mappings` | Query-interface request and response mappings |
| `cr_asset_types` | Catalogue asset-type definitions |
| `cr_catalogues` | Registered remote catalogues |
| `dcm_audit_chain_state` | Current transformation audit-chain head |
| `dcm_audit_log` | Administrative and authorization audit |
| `dcm_heartbeats` | Module heartbeat records |
| `dcm_llm_usage` | LLM usage accounting |
| `dcm_local_schema_versions` | Local schema version history |
| `dcm_remote_catalogs` | Compatibility/lookup records used by current flows |
| `dcm_remote_schemas` | Remote schema records used by current flows |
| `dcm_system_settings` | DCM system settings |
| `dcm_transformation_audit` | Per-asset transformation and hash-chain evidence |
| `hv_runs` | Harvest run lifecycle and counts |
| `lc_assets` | Shared Local Catalogue assets |
| `sr_llm_configs` | LLM tuning configurations |
| `sr_local_schemas` | Local schema definitions |
| `sr_mappings` | Remote-to-local transformation mappings |
| `sr_prompts` | Prompt identities and immutable versions |
| `sr_providers` | Encrypted provider configuration |
| `sr_test_cases` | Prompt/transformation test cases |

Collection names are an implementation contract. Re-scan the deployed flow version before applying production indexes.

Suggested baseline indexes for collections used by the current flow:

```js
db.auth_sessions.createIndex({ token: 1 }, { unique: true });
db.auth_sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
db.cr_catalogues.createIndex({ id: 1 }, { unique: true });
db.hv_runs.createIndex({ startedAt: -1 });
db.lc_assets.createIndex({ uniqueId: 1 });
db.lc_assets.createIndex({ catalogueId: 1, assetTypeId: 1 });
db.sr_local_schemas.createIndex({ id: 1 });
db.sr_mappings.createIndex({ id: 1 });
db.sr_prompts.createIndex({ promptId: 1, version: 1 }, { unique: true });
db.sr_providers.createIndex({ id: 1 }, { unique: true });
db.dcm_transformation_audit.createIndex({ sequence: 1 }, { unique: true, sparse: true });
db.dcm_transformation_audit.createIndex({ timestamp: -1 });
db.dcm_audit_log.createIndex({ timestamp: -1 });
```

Validate existing duplicates and legacy rows before creating a unique index.

## 13. Security notes

- Keep provider keys and Keycloak client secrets outside source control.
- Provider responses must never return stored key material.
- Terminate TLS at the deployment ingress or reverse proxy.
- Protect the XFSC-ORCE editor separately from the DCM UI.
- Restrict MongoDB network access and use authenticated connections.
- Back up the encryption key used for provider credentials.
- Treat exported flow files, debug output, and audit exports as potentially sensitive.

## 14. Troubleshooting

### Catalogue or assets do not appear after refresh

Wait for session restoration, navigate to another module and back, or refresh once. If the count remains zero, inspect XFSC-ORCE module messages and MongoDB connectivity.

### Harvest stays queued

Check that the M3 Harvester module is deployed, the catalogue is enabled, and its endpoint is reachable. Open View Details and read the run errors.

### Query interface imports zero records

Check the query endpoint, method, result MIME type, response root, and ID/name fields. For CKAN, the common response root is `result.results`.

### OAI-PMH fails

Use an HTTPS base endpoint, set a metadata prefix such as `oai_dc`, and inspect resumption-token handling in the run details.

### RDF validation is empty or not configured

Confirm the mapping is Deterministic RDF or Hybrid, the mapping has a SHACL shape, Schema Mapping is enabled in the wizard, and the audit Details contain the SHACL result.

### AI generation fails

Test the Provider first. Then check its endpoint, provider type, model, encrypted credential, prompt lifecycle status, required `{SOURCE_ASSET}` variable, and the mapping's attached prompt/config. Do not mark AI-driven as working from a provider row that only says Key set.

## 15. Verification status for this documentation audit

| Area | Status on 2026-07-29 |
|---|---|
| Current navigation and form labels | Verified in UI |
| Query REST, SPARQL, OAI-PMH | Successful run evidence present |
| Deterministic RDF and SHACL | Fresh end-to-end PASS |
| JSON Field Mapping | Mapping exists; fresh transformed audit evidence not established in this audit |
| Hybrid AI Mapping | Fresh bounded import executed; transformation FAIL because catalogue AI fields are absent and evidence remained strategy `none` |
| AI-driven | Prompt Testing PASS; fresh end-to-end transformation FAIL because catalogue AI fields are absent and evidence remained strategy `none` |
| Collection names | Reconciled with modular XFSC-ORCE flow sources |
| RFC citation | Corrected to RFC 9727 |

For a step-by-step operator procedure, see [Getting Started - Test Environment and End-to-end Validation](docs/GETTING-STARTED-TEST-ENVIRONMENT.md).

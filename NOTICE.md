# Notices for Eclipse FACIS FAP Decentralized Catalogue Management

This content is produced and maintained by the project contributors in the context of the Eclipse FACIS project.

## Project Information

- **Project:** Eclipse FACIS — Federation Architecture Pattern: Decentralized Catalogue Management
- **Repository:** `eclipse-xfsc/facis-fap-decentralized-catalogue-management`
- **Project home:** https://projects.eclipse.org/projects/technology.facis
- **License:** Apache License 2.0

## Copyright

Copyright (c) 2025–2026 project contributors.

## Repository Components

This repository contains the DCM platform, including:

- ORCE backend flows for Schema Registry, Catalogue Registry, Harvester, Admin Tools, Local Catalogue, and Auth
- A Vue 3 dashboard served through the ORCE/uibuilder runtime
- Frontend build tooling and generated public assets
- Deployment assets, including Helm-related resources
- Documentation and operational guidance for local and deployed environments

## Third-Party Notices

The repository depends on third-party open source software. The following list is a high-level summary and may not be exhaustive. Package manifests and lockfiles remain the authoritative source for dependency versions.

| Component | License | Usage |
|---|---|---|
| ORCE | Apache-2.0 | Flow runtime for backend modules |
| uibuilder | Apache-2.0 | Runtime bridge between ORCE and the dashboard |
| Vue | MIT | Frontend application framework |
| CodeMirror | MIT | Embedded code editor for prompts, mappings, and schema/RDF editing |
| Vite | MIT | Frontend development tooling |
| esbuild | MIT | Frontend bundling |
| serve | MIT | Local static file serving for development |
| MongoDB | SSPL | Persistence layer for DCM runtime data |
| Docker | Apache-2.0 | Containerized deployment support |
| Kubernetes | Apache-2.0 | Deployment target for orchestrated environments |
| Helm | Apache-2.0 | Kubernetes packaging and deployment support |

## Cryptography

DCM stores sensitive provider configuration using authenticated encryption through runtime platform cryptographic APIs. Generated keys, credentials, certificates, and environment-specific secrets are not bundled with this repository and must be provisioned securely by operators.

## Generated and Packaged Assets

Files under `public/` may include generated frontend bundles created from the source tree. When modifying generated assets, ensure the corresponding source changes and build instructions are kept in sync.

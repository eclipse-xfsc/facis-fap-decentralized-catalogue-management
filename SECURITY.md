# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in this repository, report it responsibly.

**Do not open a public issue for security vulnerabilities.**

Use the Eclipse security reporting process instead:

- **Email:** security@eclipse.org
- **Security page:** https://www.eclipse.org/security/

Include as much detail as possible:

- A clear description of the vulnerability
- Steps to reproduce the issue
- Affected component, route, flow, or deployment artifact
- Potential impact and affected data, if known
- Suggested remediation, if available
- Relevant logs, screenshots, or proof-of-concept details

## Supported Versions

This repository does not currently publish formal release branches. Security support applies to the active `main` branch and to the current DCM deployment artifacts maintained from this repository.

| Component | Location | Supported |
|---|---|---|
| DCM frontend | `src/`, `public/`, `build.js` | Yes |
| DCM ORCE flows | `backend/src/` | Yes |
| Deployment assets | `deployment/helm/` | Yes |
| Packaged runtime image | Current documented DCM image | Yes |

Older local copies, unpublished forks, and modified deployments are not covered unless the vulnerability can be reproduced against the maintained repository state.

## Security-Relevant Components

DCM includes the following security-sensitive areas:

- **Authentication and sessions:** User login, token handling, session expiration, password changes, and access-area resolution.
- **Authorization:** Role and permission checks for Schema Registry, Catalogue Registry, Harvester, Local Catalogue, and Admin Tools actions.
- **Secrets handling:** Encrypted storage and retrieval of provider credentials and other sensitive configuration values.
- **Catalogue ingestion:** Remote catalogue registration, API mappings, scheduled harvesting, validation, and transformation of external records.
- **Auditability:** Append-only audit logs for authenticated actions, denied access, harvest activity, and transformation provenance.
- **Deployment hardening:** ORCE editor protection, reverse proxy configuration, TLS termination, container settings, and runtime environment variables.
- **Persistence:** MongoDB collections containing users, roles, sessions, catalogue metadata, schemas, mappings, harvest logs, and local catalogue records.

## General Security Principles

Contributors should follow these practices when changing security-sensitive code or flows:

- Validate all inbound client and remote catalogue payloads before persistence or transformation.
- Never commit secrets, tokens, credentials, generated keys, or local environment files.
- Keep provider credentials encrypted at rest and avoid logging secret material.
- Preserve permission checks for every privileged action.
- Ensure denied authorization attempts are auditable.
- Use least-privilege roles for local development and deployed environments.
- Protect the ORCE editor and administrative routes in production deployments.
- Use TLS for public endpoints and secure transport for internal service communication where applicable.
- Review dependency updates for known vulnerabilities and license compatibility.

## Dependency and Supply Chain Security

Before submitting dependency changes:

- Run `npm audit` where applicable.
- Review `package.json` and lockfile changes carefully.
- Avoid unnecessary runtime dependencies.
- Confirm that dependency licenses are compatible with this repository's license requirements.
- Document any new externally exposed service, port, or credential requirement.

## Disclosure Handling

Security reports should remain private until a fix is available and maintainers have coordinated disclosure. Public issues, pull requests, or discussions should not include exploit details until disclosure is approved.

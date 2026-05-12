# Contributing to FACIS FAP Decentralized Catalogue Management

Thank you for your interest in contributing to DCM. This document describes how to contribute to the Decentralized Catalogue Management repository.

## Contributor Agreement

Before your contribution can be accepted, you must complete the Eclipse Contributor Agreement (ECA) version 3.1.0 or higher:

https://www.eclipse.org/legal/ECA.php

All contributions must comply with the ECA and with the repository license requirements.

## Repository Structure

| Area | Path | Description |
|---|---|---|
| Backend flows | `backend/src/` | ORCE flow modules for DCM backend functionality |
| Deployment | `deployment/helm/` | Helm and deployment-related assets |
| Documentation images | `docimg/` | Images used by repository documentation |
| Frontend source | `src/` | Vue 3 dashboard source code |
| Public assets | `public/` | Built frontend assets served by the runtime |
| Build script | `build.js` | Frontend build and bundle entry point |
| Package manifest | `package.json` | JavaScript dependencies and scripts |

The DCM backend is organized around the following functional modules:

- Schema Registry
- Catalogue Registry
- Harvester
- Admin Tools
- Local Catalogue
- Auth

## Development Setup

```bash
# Clone the repository
git clone https://github.com/eclipse-xfsc/facis-fap-decentralized-catalogue-management.git
cd facis-fap-decentralized-catalogue-management

# Install frontend dependencies
npm install

# Start the frontend development loop
npm run dev

# Build production assets
npm run build

# Serve built assets locally
npm run serve
```

For a containerized local runtime, follow the deployment instructions in the repository `README.md`. Keep local secrets and generated keys out of version control.

## Development Guidelines

- Keep changes focused and reviewable.
- Update documentation when behavior, configuration, routes, permissions, or deployment steps change.
- Preserve existing message contracts between the dashboard and ORCE backend flows.
- Validate inputs before storing records or invoking catalogue harvest/transformation logic.
- Avoid logging credentials, tokens, API keys, generated keys, or sensitive catalogue data.
- Keep generated frontend assets in sync with source changes when they are committed.
- Prefer small, explicit changes to ORCE flow files so reviewers can inspect security and routing impact.

## Code and Content Standards

- **Frontend:** Vue 3 with the existing build pipeline.
- **Backend runtime:** ORCE flow modules under `backend/src/`.
- **Persistence:** MongoDB collections documented in the repository README.
- **Formatting:** Follow the existing style in the file being edited.
- **Security:** Maintain authentication, permission checks, audit logging, and encrypted secret storage.
- **License:** All contributed code and content must be compatible with the Apache License 2.0.

## Testing and Verification

Before opening a pull request, run the checks that apply to your change:

```bash
# Install dependencies
npm install

# Build frontend assets
npm run build

# Optional local static check
npm run serve
```

For runtime verification, use the documented local deployment path and exercise the affected DCM workflow, such as:

- Creating or editing schemas
- Registering a remote catalogue
- Creating mappings or prompts
- Starting and monitoring a harvest
- Checking local catalogue records
- Reviewing audit log entries
- Managing users, roles, and permissions

If the repository smoke test script is present in your checkout, run it against a local instance and include the result in your pull request description.

## Submitting Changes

1. Create a feature branch from `main`.
2. Make the smallest practical change that solves the issue.
3. Add or update documentation and verification notes.
4. Run relevant builds and manual checks.
5. Open a pull request with a clear summary, rationale, and test evidence.
6. Link related issues when applicable.
7. Address review feedback promptly and keep the pull request up to date with `main`.

## Commit Guidelines

- Use clear, imperative commit messages.
- Group related changes together.
- Do not mix formatting-only changes with functional changes unless necessary.
- Do not commit local runtime data, logs, generated secrets, editor settings, or environment files.

## Reporting Issues

Use the repository issue tracker for non-security issues. Include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Browser and runtime environment details
- Relevant logs or screenshots
- Affected DCM module or UI path

For security vulnerabilities, follow `SECURITY.md` instead of opening a public issue.

## License Compliance

- Use dependencies with licenses compatible with this repository.
- Document new third-party dependencies and their purpose.
- Do not copy code from incompatible sources.
- Preserve copyright and license headers where present.

## Code of Conduct

Participation in this project is governed by the repository `CODE_OF_CONDUCT.md`.

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0, as described in the repository `LICENSE` file.

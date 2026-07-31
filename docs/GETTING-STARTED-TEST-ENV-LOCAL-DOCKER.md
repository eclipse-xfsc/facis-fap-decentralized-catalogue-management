# Getting Started with the DCM Environment

This guide explains how to deploy the DCM Docker environment and complete the required Keycloak and MongoDB configuration before using the dashboard.

No usernames, passwords, client secrets, API keys, database credentials, or access tokens are included. Obtain deployment-specific values through your organisation's approved secure channel.

## 1. Prerequisites

Before starting, confirm that you have:

- Docker installed and running
- permission to pull the DCM container image
- permission to configure the XFSC-ORCE environment
- access to a running Keycloak installation
- a Keycloak realm and clients prepared for DCM
- access to a MongoDB deployment
- network connectivity from the DCM container to Keycloak and MongoDB
- ports `1880` and `8080` available on the Docker host
- a modern web browser

Confirm Docker is available:

```bash
docker version
```

## 2. Prepare the external services

DCM depends on Keycloak for authentication and MongoDB for persistent application data. Both services must be reachable from inside the DCM container.

Before deploying DCM, collect the following information without placing any secrets in this document:

- Keycloak base URL
- Keycloak realm name
- DCM UI client ID
- login client ID
- permitted DCM redirect URI
- administrative client ID
- administrative client secret
- MongoDB connection address
- MongoDB database name
- MongoDB authentication database, when required
- MongoDB username and password, when authentication is enabled
- TLS certificates or certificate-authority information, when required

The Keycloak clients, redirect URIs, web origins, service accounts, and required roles should be configured by the identity-management administrator before the DCM login is tested.

## 3. Pull and start the DCM container

Pull the required image:

```bash
docker pull ecofacis/dcm:v2.1
```

Start the environment:

```bash
docker run -d --name dcm-test -p 1880:1880 -p 8080:8080 ecofacis/dcm:v2.1
```

This command creates a container named `dcm-test`, exposes XFSC-ORCE on port `1880`, exposes FileBrowser on port `8080`, and runs the container in the background.

Confirm that the container is running:

```bash
docker ps
```

View startup messages when necessary:

```bash
docker logs dcm-test
```

The container can be stopped and started again with:

```bash
docker stop dcm-test
docker start dcm-test
```

Do not remove and recreate a configured container until its configuration and persistent data have been backed up or stored on approved persistent volumes.

## 4. Open the services

| URL | Service | Purpose |
| --- | --- | --- |
| `http://localhost:1880/ui` | DCM dashboard | Normal catalogue, schema, transformation, harvest, audit, and administration work |
| `http://localhost:1880` | XFSC-ORCE | Backend flow configuration, deployment, status, and diagnostics |
| `http://localhost:8080` | FileBrowser | Inspection of files stored in the environment |

Configure XFSC-ORCE before attempting to sign in to the DCM dashboard.

## 5. Configure Keycloak for DCM authentication

Open XFSC-ORCE:

```text
http://localhost:1880
```


Open the authentication flow and locate the node named:

```text
Auth credentials & configuration manager (M6)
```

The node reads its Keycloak configuration from environment values. Configure the values in the XFSC-ORCE environment or configuration interface used by your deployment. Do not replace the environment lookups with literal credentials in the function source.

The required configuration is:

```javascript
cfg = {
    keycloak: {
        baseUrl: String(env.get("KEYCLOAK_BASE_URL") || "").replace(/\/$/, ""),
        realm: String(env.get("KEYCLOAK_REALM") || ""),
        uiClientId: String(env.get("KEYCLOAK_UI_CLIENT_ID") || ""),
        loginClientId: String(env.get("KEYCLOAK_LOGIN_CLIENT_ID") || ""),
        redirectUri: String(env.get("KEYCLOAK_REDIRECT_URI") || ""),
        adminClientId: String(env.get("KEYCLOAK_ADMIN_CLIENT_ID") || ""),
        adminClientSecret: String(env.get("KEYCLOAK_ADMIN_CLIENT_SECRET") || "")
    }
};
```

Configure every variable listed below.

| Environment variable | Required value |
| --- | --- |
| `KEYCLOAK_BASE_URL` | Base URL of the Keycloak server. Use the URL reachable from the DCM container. A trailing slash is not required. |
| `KEYCLOAK_REALM` | Exact name of the Keycloak realm used for DCM users and clients. Realm names are case-sensitive. |
| `KEYCLOAK_UI_CLIENT_ID` | Client ID representing the browser-based DCM dashboard. It must allow the dashboard's redirect URI and web origin. |
| `KEYCLOAK_LOGIN_CLIENT_ID` | Client ID used by the DCM authentication exchange. Configure the client type and grant permissions according to the organisation's Keycloak policy. |
| `KEYCLOAK_REDIRECT_URI` | Exact DCM return URI registered in Keycloak. The scheme, host, port, path, and trailing slash must match the deployed dashboard address. |
| `KEYCLOAK_ADMIN_CLIENT_ID` | Confidential service client used for authorised user-administration operations. Enable its service account only when administrative DCM functions require it. |
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | Secret belonging to the administrative client. Store it through the approved secret or credential mechanism and never in documentation or source code. |

Also add the `KEYCLOAK_ADMIN_CLIENT_SECRET` to the env vars of (M4) with the respective value.

### Keycloak checks

Before deploying the updated authentication flow, verify that:

- the base URL is reachable from the container
- the realm exists and is enabled
- all client IDs exist in the selected realm
- the DCM dashboard URI is allowed as a redirect URI
- the dashboard origin is allowed by the UI client
- the administrative client is confidential
- the administrative client has an enabled service account when required
- administrative roles are limited to the minimum permissions needed by DCM
- the client secret has not been copied into a Function node, debug message, screenshot, or document

Save the configuration and use **Save & Deploy** in XFSC-ORCE. If the environment-variable mechanism used by the deployment is read only at startup, restart the container after saving the values.

## 6. Configure MongoDB in XFSC-ORCE

Open the **Config** tab in XFSC-ORCE and locate the MongoDB configuration used by the DCM flows.

Configure the connection with values supplied by the database administrator:

| Setting | Purpose |
| --- | --- |
| MongoDB host or connection URI | Address that the DCM container can use to reach MongoDB |
| Port | MongoDB listener port when it is not already part of the URI |
| Database name | Database reserved for this DCM environment |
| Authentication database | Database against which the MongoDB user authenticates, when different from the DCM database |
| Username | MongoDB account assigned to DCM |
| Password | Password for the DCM MongoDB account, stored as a credential or secret |
| TLS settings | Required encryption mode and certificate settings for the target MongoDB deployment |
| Connection options | Replica-set, retry, timeout, or other options required by the database administrator |

Use the same MongoDB configuration for all DCM flows that share catalogue, schema, user, harvest, transformation, audit, or provider data. Avoid configuring different database names accidentally across separate MongoDB configuration nodes.

Do not place the MongoDB password in node labels, function source, debug output, exported screenshots, or documentation.

After completing the MongoDB configuration:

1. Save the Config entry.
2. Confirm that every MongoDB node references the intended Config entry.
3. Use **Save & Deploy**.
4. Review the XFSC-ORCE status and debug area for authentication, DNS, TLS, or connection errors.
5. Restart the container if the selected configuration is loaded only during startup.

The MongoDB account should have only the permissions required for the DCM database. Production deployments should use TLS and an approved secret-management process.

## 7. Restart and verify the environment

When the Keycloak or MongoDB configuration requires a restart, run:

```bash
docker restart dcm-test
```

Then follow the startup messages:

```bash
docker logs --follow dcm-test
```

Stop following the log with `Ctrl+C`; this does not stop the container.

Complete the following checks in order:

1. Open `http://localhost:1880` and confirm that XFSC-ORCE is available.
2. Confirm that the authentication and MongoDB flows are deployed without startup errors.
3. Open `http://localhost:1880/ui`.
4. Confirm that the dashboard reaches the login screen instead of remaining on session restoration.
5. Sign in with an account supplied by the environment administrator.
6. Confirm that the user's permissions are loaded from the configured authentication service.
7. Open Catalogue Registry and Schema Registry to confirm that MongoDB-backed records load.
8. Create a small non-sensitive test record, refresh the UI, and confirm that it persists.
9. Remove the disposable test record when verification is complete.

## 8. Initial DCM functional check

After deployment configuration is complete, perform a bounded public connection test.

Open:

```text
Catalogue Registry > Catalogues > Register Remote Catalogue
```

Use a public, non-sensitive endpoint approved for the test. Complete the catalogue fields, select **Test connection**, and confirm that the UI returns a controlled success or failure result.

For an unreachable test endpoint, DCM should display a useful error without importing fabricated assets or breaking the dashboard.

Before running a transformed harvest, also confirm that:

- the source and target schemas are active
- the catalogue references the intended transformation strategy
- the mapping references the intended schemas
- an LLM provider and prompt have been tested when AI processing is used
- schema mapping is enabled in the Harvest Wizard
- the run details and provenance show the actual identifiers and results

## 9. Troubleshooting

### The dashboard remains on “Restoring your session”

Check:

- `KEYCLOAK_BASE_URL` is reachable from inside the container
- `KEYCLOAK_REALM` is correct
- UI and login client IDs belong to the configured realm
- the redirect URI exactly matches the Keycloak client configuration
- the authentication flow was saved and deployed
- XFSC-ORCE did not report a deployment or flow-startup exception

After correcting the configuration, deploy the flow and refresh the dashboard. Restart the container if the values are read only during startup.

### Login returns a redirect or origin error

Compare the browser URL with `KEYCLOAK_REDIRECT_URI`, the Keycloak client's valid redirect URIs, and its permitted web origins. Scheme, hostname, port, path, and trailing slash differences can cause rejection.

### Catalogue or schema data does not load

Check:

- the MongoDB host or URI is reachable from the container
- the database and authentication-database names are correct
- the MongoDB account is authorised for the DCM database
- TLS options and certificates match the server requirements
- all MongoDB nodes reference the correct XFSC-ORCE Config entry
- the flows were deployed after the Config entry was changed

### Configuration disappears after recreating the container

Container-local changes may be lost when a container is removed. Use the persistence and secret-management approach approved for the deployment. Back up XFSC-ORCE configuration and MongoDB data before replacing a configured environment.

## 10. Security and handover checklist

Before handing the environment to another person, confirm that:

- the DCM container is running
- Keycloak and MongoDB are reachable from the container
- all seven Keycloak variables are configured
- the redirect URI and web origin match the deployed dashboard
- the administrative client uses minimum required permissions
- MongoDB uses the intended database and authentication settings
- authentication and database secrets are stored through approved secure mechanisms
- no credentials appear in documentation, screenshots, flow labels, or debug messages
- XFSC-ORCE was saved and deployed after configuration
- the dashboard login works
- MongoDB-backed records persist after a refresh
- production configuration and data are backed up appropriately

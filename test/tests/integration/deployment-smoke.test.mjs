import test from "node:test";
import assert from "node:assert/strict";

const configuredBase = process.env.DCM_BASE_URL;
const deploymentSmokeRequired = process.env.REQUIRE_DEPLOYMENT_SMOKE === "1";
const baseUrl = configuredBase
  ? new URL(configuredBase.endsWith("/") ? configuredBase : `${configuredBase}/`)
  : null;

test("deployment smoke configuration is present when required", () => {
  if (deploymentSmokeRequired) {
    assert.ok(configuredBase, "DCM_BASE_URL is required when REQUIRE_DEPLOYMENT_SMOKE=1");
  }
});

async function get(relativePath, accept = "application/json") {
  const url = new URL(relativePath.replace(/^\//, ""), baseUrl);
  const started = performance.now();
  const response = await fetch(url, {
    headers: { accept },
    signal: AbortSignal.timeout(10_000)
  });
  const elapsedMs = performance.now() - started;
  return { response, elapsedMs, text: await response.text(), url };
}

test("deployed /healthz returns the required liveness contract", {
  skip: !baseUrl && "DCM_BASE_URL is not configured"
}, async () => {
  const { response, elapsedMs, text } = await get("healthz");
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") || "", /^application\/json\b/i);
  assert.ok(elapsedMs < 2500, `healthz took ${elapsedMs.toFixed(1)} ms`);

  const body = JSON.parse(text);
  assert.equal(body.status, "ok");
  assert.equal(body.service, "facis-dcm");
  assert.ok(Number.isFinite(body.uptimeSeconds) && body.uptimeSeconds >= 0);
  assert.ok(Number.isFinite(Date.parse(body.timestamp)), "timestamp is not valid ISO date-time");
});

test("OpenAPI documents GET /healthz", {
  skip: !baseUrl && "DCM_BASE_URL is not configured"
}, async () => {
  const { response, text } = await get("api/openapi.json");
  assert.equal(response.status, 200);
  const document = JSON.parse(text);
  assert.ok(document.paths?.["/healthz"]?.get, "OpenAPI does not document GET /healthz");
  assert.deepEqual(document.paths["/healthz"].get.security, []);
});

test("deployed UI is reachable", {
  skip: !baseUrl && "DCM_BASE_URL is not configured"
}, async () => {
  const { response, elapsedMs, text } = await get("ui/", "text/html");
  assert.equal(response.status, 200);
  assert.ok(elapsedMs < 5000, `UI took ${elapsedMs.toFixed(1)} ms`);
  assert.match(text, /Facis-DCM|Decentralized Catalogue/i);
});

test("configured readiness endpoint returns a non-sensitive JSON status", {
  skip:
    !baseUrl
      ? "DCM_BASE_URL is not configured"
      : process.env.REQUIRE_READINESS !== "1"
        ? "REQUIRE_READINESS is not set to 1"
        : false
}, async () => {
  const readinessPath = process.env.DCM_READINESS_PATH || "healthz";
  const { response, text } = await get(readinessPath);
  assert.equal(response.status, 200, text.slice(0, 500));
  assert.match(response.headers.get("content-type") || "", /^application\/json\b/i);
  const body = JSON.parse(text);
  assert.ok(["ok", "ready"].includes(String(body.status).toLowerCase()));
  assert.doesNotMatch(text, /password|secret|token|mongo-uri|dcm-kms-key/i);
});

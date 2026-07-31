import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const deploymentPath = path.join(root, "deployment/helm/dcm/templates/deployment.yaml");
const hpaPath = path.join(root, "deployment/helm/dcm/templates/hpa.yaml");
const valuesPath = path.join(root, "deployment/helm/dcm/values.yaml");

test("DCM workload probes use the HTTP /healthz contract", async () => {
  const deployment = await readFile(deploymentPath, "utf8");
  const values = await readFile(valuesPath, "utf8");

  assert.doesNotMatch(deployment, /tcpSocket:/, "TCP probes must not be used for DCM health checks");
  assert.equal((deployment.match(/httpGet:/g) || []).length, 3, "startup, readiness and liveness must use HTTP");
  assert.match(values, /startup:\s*[\s\S]*?path:\s*\/healthz/);
  assert.match(values, /readiness:\s*[\s\S]*?path:\s*\/healthz/);
  assert.match(values, /liveness:\s*[\s\S]*?path:\s*\/healthz/);
});

test("DCM chart includes configurable autoscaling and zero-downtime rollout settings", async () => {
  const deployment = await readFile(deploymentPath, "utf8");
  const hpa = await readFile(hpaPath, "utf8");
  const values = await readFile(valuesPath, "utf8");

  assert.match(hpa, /apiVersion:\s*autoscaling\/v2/);
  assert.match(hpa, /kind:\s*HorizontalPodAutoscaler/);
  assert.match(hpa, /scaleTargetRef:[\s\S]*?kind:\s*Deployment/);
  assert.match(values, /autoscaling:[\s\S]*?enabled:\s*false/);
  assert.match(values, /maxUnavailable:\s*0/);
  assert.match(values, /maxSurge:\s*1/);
  assert.match(deployment, /if not \.Values\.autoscaling\.enabled/);
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const backendDir = path.join(root, "backend", "src");

async function readJson(file) {
  return JSON.parse(await readFile(file, "utf8"));
}

function flattenWireTargets(node) {
  return (node.wires || []).flat().filter(Boolean);
}

test("all Node-RED flow files contain valid JSON arrays", async () => {
  assert.ok(existsSync(backendDir), "backend/src is missing");
  const files = (await readdir(backendDir))
    .filter((name) => name.endsWith("_flow.json") || name === "full_assembled_out_flow.json");

  assert.ok(files.length >= 7, `expected assembled flow and six module flows, found ${files.length}`);

  for (const name of files) {
    const flow = await readJson(path.join(backendDir, name));
    assert.ok(Array.isArray(flow), `${name} must contain a JSON array`);
    assert.ok(flow.length > 0, `${name} must not be empty`);
  }
});

test("assembled Node-RED flow has unique node IDs and valid wire targets", async () => {
  const flow = await readJson(path.join(backendDir, "full_assembled_out_flow.json"));
  const ids = flow.map((node) => node.id).filter(Boolean);
  const unique = new Set(ids);

  assert.equal(unique.size, ids.length, "duplicate Node-RED node IDs found");

  const missing = [];
  for (const node of flow) {
    for (const target of flattenWireTargets(node)) {
      if (!unique.has(target)) missing.push(`${node.id} -> ${target}`);
    }
  }
  assert.deepEqual(missing, [], `missing wire targets:\n${missing.join("\n")}`);
});

test("HTTP routes are unique by method and path", async () => {
  const flow = await readJson(path.join(backendDir, "full_assembled_out_flow.json"));
  const routes = flow.filter((node) => node.type === "http in");
  const seen = new Map();
  const duplicates = [];

  for (const node of routes) {
    const key = `${String(node.method || "get").toLowerCase()} ${node.url}`;
    if (seen.has(key)) duplicates.push(`${key}: ${seen.get(key)} and ${node.id}`);
    seen.set(key, node.id);
  }

  assert.deepEqual(duplicates, [], `duplicate HTTP routes:\n${duplicates.join("\n")}`);
});

test("GET /healthz is wired to an HTTP response", async () => {
  const flow = await readJson(path.join(backendDir, "full_assembled_out_flow.json"));
  const byId = new Map(flow.map((node) => [node.id, node]));
  const starts = flow.filter(
    (node) =>
      node.type === "http in" &&
      String(node.method || "get").toLowerCase() === "get" &&
      node.url === "/healthz"
  );

  assert.equal(starts.length, 1, "expected exactly one GET /healthz HTTP In node");

  const queue = [starts[0].id];
  const visited = new Set();
  let responseFound = false;

  while (queue.length) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    const node = byId.get(id);
    if (!node) continue;
    if (node.type === "http response") {
      responseFound = true;
      break;
    }
    queue.push(...flattenWireTargets(node));
  }

  assert.ok(responseFound, "GET /healthz is not connected to an HTTP Response node");
});


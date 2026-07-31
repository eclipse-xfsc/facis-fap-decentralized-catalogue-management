import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const scanRoots = ["src", "backend", "deployment"]
  .map((name) => path.join(root, name))
  .filter(existsSync);

const allowedExtensions = new Set([
  ".js", ".mjs", ".json", ".html", ".css", ".md", ".yaml", ".yml", ".tpl"
]);

async function walk(dir) {
  const result = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (["node_modules", ".git", "public"].includes(entry.name)) continue;
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) result.push(...(await walk(file)));
    else if (allowedExtensions.has(path.extname(entry.name))) result.push(file);
  }
  return result;
}

const secretPatterns = [
  ["OpenAI-style API key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/g],
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ["seeded default password", /["']password["']\s*:\s*["'](?:1234|admin|password)["']/gi]
];

test("source tree contains no obvious committed secrets", async () => {
  assert.ok(scanRoots.length > 0, "no source directories found");
  const findings = [];

  for (const scanRoot of scanRoots) {
    for (const file of await walk(scanRoot)) {
      const text = await readFile(file, "utf8");
      for (const [label, pattern] of secretPatterns) {
        pattern.lastIndex = 0;
        if (pattern.test(text)) findings.push(`${label}: ${path.relative(root, file)}`);
      }
    }
  }

  assert.deepEqual(findings, [], `possible committed secrets:\n${findings.join("\n")}`);
});


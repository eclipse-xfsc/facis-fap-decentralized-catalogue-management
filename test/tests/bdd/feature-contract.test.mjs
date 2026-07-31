import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const featureDir = path.join(process.cwd(), "test", "features");

test("BDD feature files contain complete and uniquely named scenarios", async () => {
  const files = (await readdir(featureDir)).filter((name) => name.endsWith(".feature"));
  assert.ok(files.length >= 16, `expected at least sixteen feature files, found ${files.length}`);

  const scenarioNames = [];
  let totalScenarios = 0;

  for (const file of files) {
    const text = await readFile(path.join(featureDir, file), "utf8");
    assert.match(text, /^Feature:/m, `${file} has no Feature declaration`);
    assert.match(text, /^\s+Given /m, `${file} has no Given step`);
    assert.match(text, /^\s+When /m, `${file} has no When step`);
    assert.match(text, /^\s+Then /m, `${file} has no Then step`);

    const names = [...text.matchAll(/^\s*Scenario(?: Outline)?:\s*(.+)$/gm)]
      .map((match) => match[1].trim());
    assert.ok(names.length > 0, `${file} has no scenarios`);
    totalScenarios += names.length;
    scenarioNames.push(...names);
  }

  assert.ok(totalScenarios >= 55, `expected at least 55 scenarios, found ${totalScenarios}`);
  assert.equal(new Set(scenarioNames).size, scenarioNames.length, "duplicate BDD scenario names found");
});

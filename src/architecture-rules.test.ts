import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  assertLayerDependencies,
  extractRelativeImports,
  layerForPath,
} from "./testing/architecture-rules.js";

test("architecture rules reject a domain import into infrastructure", () => {
  assert.throws(
    () => assertLayerDependencies("domain", ["../infrastructure/cli/main.js"]),
    /forbidden dependency/,
  );
});

test("architecture rules allow application imports into domain and ports", () => {
  assert.doesNotThrow(() =>
    assertLayerDependencies("application", ["../domain/index.js", "../ports/index.js"]),
  );
});

test("the current source tree respects its layer directions", async () => {
  const paths = [
    "src/domain/index.ts",
    "src/domain/generation-brief/index.ts",
    "src/application/index.ts",
    "src/ports/index.ts",
    "src/infrastructure/index.ts",
  ];

  for (const path of paths) {
    const source = await readFile(path, "utf8");
    assertLayerDependencies(layerForPath(path), extractRelativeImports(source));
  }
});

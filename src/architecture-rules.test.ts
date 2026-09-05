import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  assertConsonantRhymeCatalogBoundary,
  assertLayerDependencies,
  extractRelativeImports,
  layerForPath,
} from "./testing/architecture-rules.js";

test("rhyme consumers must delegate family decisions to the approved catalog", () => {
  assert.throws(
    () => assertConsonantRhymeCatalogBoundary("src/application/fake.ts", "const family = word.slice(word.lastIndexOf('a'));"),
    /fake\.ts.*approved consonant rhyme catalog boundary/i,
  );
  assert.doesNotThrow(() =>
    assertConsonantRhymeCatalogBoundary(
      "src/content/approved-consonant-rhyme-catalog/index.ts",
      "export function findFamilyByWord(word: string) { return index.get(word); }",
    ),
  );
});

test("catalog boundary rejects consumer imports that bypass the owner", () => {
  assert.throws(
    () => assertConsonantRhymeCatalogBoundary("src/application/rhymes.ts", "import { asConsonantPhoneticTail } from '../content/approved-consonant-rhyme-catalog/index.js';\nconst tail = asConsonantPhoneticTail(word);"),
    /owner boundary/i,
  );
});

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
    "src/ports/structured-llm-generation/index.ts",
    "src/infrastructure/index.ts",
  ];

  for (const path of paths) {
    const source = await readFile(path, "utf8");
    assertLayerDependencies(layerForPath(path), extractRelativeImports(source));
  }
});

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  assertConsonantRhymeCatalogBoundary,
  assertBoundaryExceptions,
  assertLayerDependencies,
  extractRelativeImports,
  layerForPath,
} from "./testing/architecture-rules.js";

test("boundary exceptions require an exact file, rationale, and removal condition", () => {
  assert.doesNotThrow(() =>
    assertBoundaryExceptions([
      {
        path: "src/application/legacy-rhyme-adapter.ts",
        reason: "kept while QG-41 migration is deployed",
        removalCondition: "remove after QG-41 merges",
      },
    ]),
  );

  assert.throws(
    () => assertBoundaryExceptions([
      { path: "src/application/", reason: "temporary", removalCondition: "later" },
    ]),
    /exact file|directory|broad/i,
  );
  assert.throws(
    () => assertBoundaryExceptions([
      { path: "src/application/legacy-rhyme-adapter.ts", reason: "temporary", removalCondition: "" },
    ]),
    /removal condition/i,
  );
  assert.throws(
    () => assertBoundaryExceptions([
      { path: "src/application/legacy-rhyme-adapter.ts", reason: "", removalCondition: "remove later" },
    ]),
    /reason/i,
  );
});

test("boundary exceptions are opt-in and do not silently bypass the boundary", () => {
  assert.throws(
    () => assertConsonantRhymeCatalogBoundary(
      "src/application/legacy-rhyme-adapter.ts",
      "const familyTail = word.slice(word.lastIndexOf('a'));",
    ),
    /catalog boundary/i,
  );
  assert.doesNotThrow(() =>
    assertConsonantRhymeCatalogBoundary(
      "src/application/legacy-rhyme-adapter.ts",
      "const familyTail = word.slice(word.lastIndexOf('a'));",
      [{
        path: "src/application/legacy-rhyme-adapter.ts",
        reason: "kept while QG-41 migration is deployed",
        removalCondition: "remove after QG-41 merges",
      }],
    ),
  );
});

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

test("application, CLI and validator consumers cannot derive families locally", () => {
  for (const path of [
    "src/application/rhymes.ts",
    "src/infrastructure/cli/commands/inspect-rhymes.ts",
    "src/validators/rhyme/index.ts",
  ]) {
    assert.throws(
      () =>
        assertConsonantRhymeCatalogBoundary(
          path,
          "const familyTail = word.slice(word.lastIndexOf('a'));",
        ),
      new RegExp(`${path.replaceAll("/", "\\/")}.*catalog boundary`, "i"),
    );
  }

  assert.doesNotThrow(() =>
    assertConsonantRhymeCatalogBoundary(
      "src/application/text-normalization.ts",
      "return value.trim().toLocaleLowerCase('es');",
    ),
  );
});

test("adversarial catalog doubles expose consumers that infer families from spelling", () => {
  const catalog = {
    findFamilyByWord(word: string): { key: string } | undefined {
      return word === "dragón" ? { key: "catalog-approved-family" } : undefined;
    },
  };

  const consumer = (word: string): string => {
    // This deliberately resembles an orthographic implementation while the
    // double assigns a contradictory family. A real consumer must delegate.
    return word.slice(word.lastIndexOf("a"));
  };

  const expected = catalog.findFamilyByWord("dragón");
  assert.ok(expected, "fixture must provide the adversarial catalog family");
  assert.notEqual(
    consumer("dragón"),
    expected.key,
    "a consumer bypassing the catalog must not accidentally pass the double",
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

import assert from "node:assert/strict";
import test from "node:test";

import type { WordAnalysisPort } from "../../ports/index.js";
import {
  createInspectApprovedRhymes,
  type InspectApprovedRhymesRequest,
} from "./index.js";
import {
  createInspectRhymesDictionary,
  createInspectRhymesCatalog,
  INSPECT_RHYMES_DICTIONARY_VERSION,
} from "./inspect-approved-rhymes-fixtures.js";

const analyzer: WordAnalysisPort = {
  analyze: (form) => ({
    ok: true,
    form,
    syllables: [form],
    stressedSyllableIndex: 0,
    stressKind: "aguda",
    phenomena: { diphthongs: [], hiatuses: [], triphthongs: [] },
    versions: { adapter: "test-analyzer/1", library: "test" },
  }),
};

const request = (
  overrides: Partial<InspectApprovedRhymesRequest> = {},
): InspectApprovedRhymesRequest => ({
  word: "dragón",
  dictionaryVersion: INSPECT_RHYMES_DICTIONARY_VERSION,
  ...overrides,
});

test.describe("inspect-approved-rhymes", () => {
  test.it("rejects a reliable analysis/catalog family mismatch with both keys", () => {
    const catalog = createInspectRhymesCatalog();
    const inconsistentCatalog = {
      ...catalog,
      findFamilyByWord: (word: string) => {
        const family = catalog.findFamilyByWord(word);
        return family === undefined
          ? undefined
          : { ...family, tail: { ...family.tail, value: "an" } };
      },
    };

    const result = createInspectApprovedRhymes({
      dictionary: createInspectRhymesDictionary(),
      analyzer,
      catalog: inconsistentCatalog,
    }).inspect(request());

    if (result.ok)
      throw new Error("Expected inspection failure for catalog mismatch, got ok");

    assert.equal(result.error.code, "CATALOG_INCONSISTENCY");
    assert.equal(result.error.analysisKey, "on");
    assert.equal(result.error.catalogKey, "an");
  });

  test.it("preserves catalog exclusions for doubtful or incompatible members", () => {
    const catalog = createInspectRhymesCatalog();
    const result = createInspectApprovedRhymes({
      dictionary: createInspectRhymesDictionary(),
      analyzer,
      catalog: {
        ...catalog,
        explainRhymesForWord: () => ({
          words: [],
          explanation: {
            code: "no-approved-rhyme-after-filters" as const,
            familyTail: catalog.findFamilyByWord("dragón")?.tail,
            filters: {},
            consideredApprovedWords: ["balcón", "canción", "marrón"],
            exclusions: [
              { word: "balcón", code: "DOUBTFUL_ANALYSIS", message: "Análisis dudoso" },
              { word: "canción", code: "METADATA_INCOMPATIBLE", message: "Metadatos incompatibles" },
            ],
          },
        }),
      },
    }).inspect(request());

    if (!result.ok)
      throw new Error(`Expected inspection success, got ${result.error.code}`);

    assert.deepEqual(
      result.value.exclusions.map((exclusion) => [exclusion.form, exclusion.reason.code]),
      [
        ["balcón", "DOUBTFUL_ANALYSIS"],
        ["canción", "METADATA_INCOMPATIBLE"],
      ],
    );
  });

  test.it(
    "returns the approved family with analysis and stable editorial ordering",
    () => {
      const result = createInspectApprovedRhymes({
        dictionary: createInspectRhymesDictionary(),
        analyzer, catalog: createInspectRhymesCatalog(),
      }).inspect(request());

      if (!result.ok)
        throw new Error(
          `Expected inspection success, got ${result.error.code}`,
        );

      assert.equal(result.value.word.form, "dragón");
      assert.equal(result.value.word.analysis.stressKind, "aguda");
      assert.equal(result.value.family.key, "on");
      assert.deepEqual(
        result.value.candidates.map((candidate) => candidate.form),
        ["balcón", "canción", "marrón"],
      );
      assert.equal(result.value.candidates[0]?.category, "sustantivo");
      assert.equal(result.value.candidates[0]?.roles.preparation, true);
    },
  );

  test.it(
    "applies category and role filters while explaining excluded candidates",
    () => {
      const result = createInspectApprovedRhymes({
        dictionary: createInspectRhymesDictionary(),
        analyzer, catalog: createInspectRhymesCatalog(),
      }).inspect(request({ category: "sustantivo", role: "PREPARATION" }));

      if (!result.ok)
        throw new Error(
          `Expected inspection success, got ${result.error.code}`,
        );

      assert.deepEqual(
        result.value.candidates.map((candidate) => candidate.form),
        ["balcón"],
      );
      assert.deepEqual(
        result.value.exclusions.map((exclusion) => [
          exclusion.form,
          exclusion.reason.code,
        ]),
        [
          ["canción", "ROLE_NOT_ALLOWED"],
          ["marrón", "CATEGORY_MISMATCH"],
        ],
      );
    },
  );

  test.it(
    "returns empty candidates and explained exclusions when the family has no surviving pairs",
    () => {
      const result = createInspectApprovedRhymes({
        dictionary: createInspectRhymesDictionary(),
        analyzer, catalog: createInspectRhymesCatalog(),
      }).inspect(request({ category: "verbo" }));

      if (!result.ok)
        throw new Error(
          `Expected inspection success, got ${result.error.code}`,
        );

      assert.deepEqual(result.value.candidates, []);
      assert.ok(
        result.value.exclusions.length > 0,
        "Expected exclusions to explain why no candidates survived",
      );
      for (const exclusion of result.value.exclusions) {
        assert.ok(
          exclusion.form.length > 0,
          "Excluded candidate form must be present",
        );
        assert.ok(
          exclusion.reason.code.length > 0,
          "Exclusion reason code must be present",
        );
        assert.ok(
          exclusion.reason.message.length > 0,
          "Exclusion reason message must be present",
        );
      }
    },
  );

  test.it(
    "rejects an unknown word that does not belong to the requested snapshot",
    () => {
      const result = createInspectApprovedRhymes({
        dictionary: createInspectRhymesDictionary(),
        analyzer, catalog: createInspectRhymesCatalog(),
      }).inspect(request({ word: "quimera" }));

      if (result.ok)
        throw new Error("Expected inspection failure for unknown word, got ok");

      assert.equal(result.error.code, "UNKNOWN_WORD");
      assert.equal(result.error.word, "quimera");
    },
  );

  test.it(
    "rejects a request when the dictionary version is unavailable",
    () => {
      const result = createInspectApprovedRhymes({
        dictionary: createInspectRhymesDictionary(),
        analyzer, catalog: createInspectRhymesCatalog(),
      }).inspect(request({ dictionaryVersion: "dictionary-9999-01-01" }));

      if (result.ok)
        throw new Error(
          "Expected inspection failure for unavailable version, got ok",
        );

      assert.equal(result.error.code, "DICTIONARY_VERSION_UNAVAILABLE");
      if (result.error.code === "DICTIONARY_VERSION_UNAVAILABLE") {
        assert.equal(result.error.version, "dictionary-9999-01-01");
        assert.ok(
          result.error.availableVersions.length > 0,
          "Should list available versions",
        );
      }
    },
  );

  test.it("rejects a word whose analysis is doubtful or fails", () => {
    const doubtfulAnalyzer: WordAnalysisPort = {
      analyze: (form) => ({
        ok: false,
        form,
        error: {
          code: "UNSUPPORTED_STRESS_KIND",
          message: "Cannot determine stress.",
        },
        versions: { adapter: "test-analyzer/1", library: "test" },
      }),
    };

    const result = createInspectApprovedRhymes({
      dictionary: createInspectRhymesDictionary(),
      analyzer: doubtfulAnalyzer, catalog: createInspectRhymesCatalog(),
    }).inspect(request());

    if (result.ok)
      throw new Error(
        "Expected inspection failure for doubtful analysis, got ok",
      );

    assert.equal(result.error.code, "DOUBTFUL_ANALYSIS");
    if (result.error.code === "DOUBTFUL_ANALYSIS") {
      assert.equal(result.error.word, "dragón");
      assert.ok(
        result.error.analysisError.length > 0,
        "Analysis error message must be present",
      );
    }
  });

  test.it("works fully offline without any LLM or generation provider", () => {
    const result = createInspectApprovedRhymes({
      dictionary: createInspectRhymesDictionary(),
    analyzer, catalog: createInspectRhymesCatalog(),
    }).inspect(request());

    if (!result.ok)
      throw new Error(`Expected inspection success, got ${result.error.code}`);

    assert.equal(result.value.word.form, "dragón");
    assert.ok(
      result.value.family.key.length > 0,
      "Family key must be computed from linguistic analysis",
    );
    assert.ok(
      result.value.candidates.length > 0,
      "Must return candidates from dictionary alone",
    );
  });
});

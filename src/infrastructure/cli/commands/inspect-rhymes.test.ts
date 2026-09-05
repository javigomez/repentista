import test from "node:test";
import assert from "node:assert/strict";

import type { WordAnalysisPort } from "../../../ports/index.js";
import { createInMemoryApprovedWordDictionary } from "../../../content/approved-word-dictionary/index.js";
import { buildApprovedConsonantRhymeCatalog } from "../../../content/approved-consonant-rhyme-catalog/index.js";
import {
  parseInspectRhymesArgs,
  inspectRhymesExitCode,
  runInspectRhymesCommand,
  INSPECT_RHYMES_EXIT_CODES,
} from "./inspect-rhymes.js";

const DICTIONARY_VERSION = "dictionary-2026-08-30";

function createTestDictionary() {
  return createInMemoryApprovedWordDictionary({
    versions: {
      [DICTIONARY_VERSION]: [
        {
          version: DICTIONARY_VERSION,
          form: "dragón",
          lemma: "dragón",
          tonicity: "aguda",
          category: "sustantivo",
          level: "basico",
          status: "approved",
          allowedAsPreparation: true,
          allowedAsPunchline: true,
        },
        {
          version: DICTIONARY_VERSION,
          form: "balcón",
          lemma: "balcón",
          tonicity: "aguda",
          category: "sustantivo",
          level: "basico",
          status: "approved",
          allowedAsPreparation: true,
          allowedAsPunchline: true,
        },
        {
          version: DICTIONARY_VERSION,
          form: "camión",
          lemma: "camión",
          tonicity: "aguda",
          category: "sustantivo",
          level: "basico",
          status: "approved",
          allowedAsPreparation: true,
          allowedAsPunchline: true,
        },
      ],
    },
  });
}

function createTestCatalog() {
  return buildApprovedConsonantRhymeCatalog({
    dictionaryVersion: DICTIONARY_VERSION,
    entries: ["dragón", "balcón"].map((word) => ({
      word, lemma: word, normalizedForm: word, category: "sustantivo",
      stress: "aguda" as const, phoneticTail: "on", status: "approved" as const,
      editorialRoles: ["preparation" as const, "punchline" as const],
    })),
  });
}

const cliDependencies = () => ({
  dictionary: createTestDictionary(), analyzer, catalog: createTestCatalog(),
});

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

test.describe("inspect-rhymes CLI", () => {
  test.describe("parseInspectRhymesArgs", () => {
    test.it("parses word and dictionary version from arguments", () => {
      const result = parseInspectRhymesArgs([
        "--word",
        "dragón",
        "--dictionary-version",
        DICTIONARY_VERSION,
      ]);

      if (!result.ok)
        throw new Error(`Expected parse success, got ${result.error.code}`);

      assert.equal(result.args.word, "dragón");
      assert.equal(result.args.dictionaryVersion, DICTIONARY_VERSION);
    });

    test.it("parses optional category and role filters", () => {
      const result = parseInspectRhymesArgs([
        "--word",
        "dragón",
        "--dictionary-version",
        DICTIONARY_VERSION,
        "--category",
        "sustantivo",
        "--role",
        "PREPARATION",
      ]);

      if (!result.ok)
        throw new Error(`Expected parse success, got ${result.error.code}`);

      assert.equal(result.args.category, "sustantivo");
      assert.equal(result.args.role, "PREPARATION");
    });

    test.it("rejects missing word", () => {
      const result = parseInspectRhymesArgs([
        "--dictionary-version",
        DICTIONARY_VERSION,
      ]);

      if (result.ok) throw new Error("Expected parse failure");

      assert.equal(result.error.code, "MISSING_WORD");
    });

    test.it("rejects missing dictionary version", () => {
      const result = parseInspectRhymesArgs(["--word", "dragón"]);

      if (result.ok) throw new Error("Expected parse failure");

      assert.equal(result.error.code, "MISSING_DICTIONARY_VERSION");
    });
  });

  test.describe("inspectRhymesExitCode", () => {
    test.it("returns 0 for success", () => {
      const exitCode = inspectRhymesExitCode({
        ok: true,
        value: {
          word: {
            form: "dragón",
            analysis: { stressKind: "aguda", syllables: ["dra", "gón"] },
          },
          family: { key: "on" },
          candidates: [],
          exclusions: [],
        },
      });

      assert.equal(exitCode, INSPECT_RHYMES_EXIT_CODES.SUCCESS);
    });

    test.it("returns 1 for unknown word", () => {
      const exitCode = inspectRhymesExitCode({
        ok: false,
        error: { code: "UNKNOWN_WORD", message: "Unknown", word: "quimera" },
      });

      assert.equal(exitCode, INSPECT_RHYMES_EXIT_CODES.UNKNOWN_WORD);
    });

    test.it("returns 2 for unavailable dictionary version", () => {
      const exitCode = inspectRhymesExitCode({
        ok: false,
        error: {
          code: "DICTIONARY_VERSION_UNAVAILABLE",
          message: "Unavailable",
          version: "v1",
          availableVersions: [],
        },
      });

      assert.equal(
        exitCode,
        INSPECT_RHYMES_EXIT_CODES.DICTIONARY_VERSION_UNAVAILABLE,
      );
    });

    test.it("returns 3 for doubtful analysis", () => {
      const exitCode = inspectRhymesExitCode({
        ok: false,
        error: {
          code: "DOUBTFUL_ANALYSIS",
          message: "Doubtful",
          word: "x",
          analysisError: "err",
        },
      });

      assert.equal(exitCode, INSPECT_RHYMES_EXIT_CODES.DOUBTFUL_ANALYSIS);
    });
  });

  test.describe("runInspectRhymesCommand", () => {
    test.it(
      "returns JSON output and success exit code for a valid word",
      () => {
        const result = runInspectRhymesCommand(
          cliDependencies(),
          ["--word", "dragón", "--dictionary-version", DICTIONARY_VERSION],
        );

        assert.equal(result.exitCode, 0);

        const parsed = JSON.parse(result.output);
        assert.equal(parsed.ok, true);
        assert.equal(parsed.value.word.form, "dragón");
      },
    );

    test.it(
      "does not invent candidates from dictionary words with a similar spelling",
      () => {
        const result = runInspectRhymesCommand(
          cliDependencies(),
          ["--word", "dragón", "--dictionary-version", DICTIONARY_VERSION],
        );

        assert.equal(result.exitCode, 0);
        const parsed = JSON.parse(result.output);
        assert.equal(parsed.ok, true);
        assert.deepEqual(
          parsed.value.candidates.map((candidate: { form: string }) => candidate.form),
          ["balcón"],
        );
        assert.ok(
          !parsed.value.candidates.some(
            (candidate: { form: string }) => candidate.form === "camión",
          ),
          "A dictionary entry absent from the approved catalog must not be invented as a candidate",
        );
      },
    );

    test.it(
      "returns JSON error output and exit code 1 for unknown word",
      () => {
        const result = runInspectRhymesCommand(
          cliDependencies(),
          ["--word", "quimera", "--dictionary-version", DICTIONARY_VERSION],
        );

        assert.equal(result.exitCode, 1);

        const parsed = JSON.parse(result.output);
        assert.equal(parsed.ok, false);
        assert.equal(parsed.error.code, "UNKNOWN_WORD");
      },
    );

    test.it(
      "returns JSON error output and exit code 4 for missing arguments",
      () => {
        const result = runInspectRhymesCommand(
          cliDependencies(),
          [],
        );

        assert.equal(result.exitCode, 4);

        const parsed = JSON.parse(result.output);
        assert.equal(parsed.ok, false);
      },
    );

    test.it(
      "produces output without importing any LLM or generation module",
      () => {
        const result = runInspectRhymesCommand(
          cliDependencies(),
          ["--word", "dragón", "--dictionary-version", DICTIONARY_VERSION],
        );

        assert.equal(result.exitCode, 0);

        const parsed = JSON.parse(result.output);
        assert.equal(parsed.ok, true);
        assert.ok(
          parsed.value.family.key.length > 0,
          "Family key must come from linguistic analysis, not LLM",
        );
      },
    );
  });
});

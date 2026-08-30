import test from "node:test";
import assert from "node:assert/strict";

import type {
  TrustedWordAnalysis,
  UntrustedWordAnalysis,
  WordAnalysisVersions,
} from "../../ports/index.js";
import { WEIWEI_SILABACION_DEPENDENCY } from "./dependency-metadata.js";
import {
  createWeiweiSilabacionWordAnalyzer,
  WEIWEI_SILABACION_ADAPTER_VERSION,
  type WeiweiSilabacionWordLike,
} from "./word-analysis-adapter.js";

const versions: WordAnalysisVersions = {
  adapter: WEIWEI_SILABACION_ADAPTER_VERSION,
  library: `${WEIWEI_SILABACION_DEPENDENCY.packageName}/${WEIWEI_SILABACION_DEPENDENCY.packageVersion}`,
};

interface GoldWordCase {
  readonly word: string;
  readonly expected: TrustedWordAnalysis;
}

const goldCorpus: readonly GoldWordCase[] = [
  {
    word: "dragón",
    expected: {
      ok: true,
      form: "dragón",
      syllables: ["dra", "gón"],
      stressedSyllableIndex: 1,
      stressKind: "aguda",
      phenomena: {
        diphthongs: [],
        hiatuses: [],
        triphthongs: [],
      },
      versions,
    },
  },
  {
    word: "fuego",
    expected: {
      ok: true,
      form: "fuego",
      syllables: ["fue", "go"],
      stressedSyllableIndex: 0,
      stressKind: "llana",
      phenomena: {
        diphthongs: ["ue"],
        hiatuses: [],
        triphthongs: [],
      },
      versions,
    },
  },
  {
    word: "poeta",
    expected: {
      ok: true,
      form: "poeta",
      syllables: ["po", "e", "ta"],
      stressedSyllableIndex: 1,
      stressKind: "llana",
      phenomena: {
        diphthongs: [],
        hiatuses: ["oe"],
        triphthongs: [],
      },
      versions,
    },
  },
  {
    word: "río",
    expected: {
      ok: true,
      form: "río",
      syllables: ["rí", "o"],
      stressedSyllableIndex: 0,
      stressKind: "llana",
      phenomena: {
        diphthongs: [],
        hiatuses: ["ío"],
        triphthongs: [],
      },
      versions,
    },
  },
];

test("normalizes the gold corpus from the pinned silabacion dependency", () => {
  const analyzer = createWeiweiSilabacionWordAnalyzer();

  for (const { word, expected } of goldCorpus) {
    const actual = analyzer.analyze(word);

    assert.deepEqual(actual, expected, `${word}: dependency analysis diverged from the gold corpus`);
  }
});

test("normalizes dependency failures as untrusted results without invented syllables", () => {
  const analyzer = createWeiweiSilabacionWordAnalyzer({
    createWord() {
      throw new Error("boom");
    },
  });

  const result = analyzer.analyze("fantasía");

  assert.equal(result.ok, false);
  if (result.ok) return;

  assertUntrusted(result, {
    form: "fantasía",
    code: "LIBRARY_ERROR",
  });
});

test("normalizes package-shaped syllables, numeric stress and composite phenomena", () => {
  const packageShapedWord: WeiweiSilabacionWordLike = {
    syllables: [
      { onset: "f", nucleus: "ue", coda: "" },
      { onset: "g", nucleus: "o", coda: "" },
    ],
    stress: 2,
    tonic: { onset: "f", nucleus: "ue", coda: "" },
    hiatuses: [],
    diphthongs: [{ syllableIndex: 0, type: 0, composite: "ue" }],
    triphthongs: [],
  };
  const analyzer = createWeiweiSilabacionWordAnalyzer({
    createWord: () => packageShapedWord,
  });

  assert.deepEqual(analyzer.analyze("fuego"), {
    ok: true,
    form: "fuego",
    syllables: ["fue", "go"],
    stressedSyllableIndex: 0,
    stressKind: "llana",
    phenomena: {
      diphthongs: ["ue"],
      hiatuses: [],
      triphthongs: [],
    },
    versions,
  });
});

test("rejects esdrújulas as unsupported instead of returning trusted analysis", () => {
  const analyzer = createWeiweiSilabacionWordAnalyzer();
  const result = analyzer.analyze("murciélago");

  assert.equal(result.ok, false);
  if (result.ok) return;

  assertUntrusted(result, {
    form: "murciélago",
    code: "UNSUPPORTED_STRESS_KIND",
  });
});

test("rejects numeric esdrújula stress enum values as unsupported", () => {
  const unsupportedWord: WeiweiSilabacionWordLike = {
    syllables: [
      { onset: "m", nucleus: "u", coda: "r" },
      { onset: "c", nucleus: "ié", coda: "" },
      { onset: "l", nucleus: "a", coda: "" },
      { onset: "g", nucleus: "o", coda: "" },
    ],
    stress: 3,
    tonic: { onset: "c", nucleus: "ié", coda: "" },
    hiatuses: [],
    diphthongs: [{ syllableIndex: 1, type: 0, composite: "ié" }],
    triphthongs: [],
  };
  const analyzer = createWeiweiSilabacionWordAnalyzer({
    createWord: () => unsupportedWord,
  });

  const result = analyzer.analyze("murciélago");

  assert.equal(result.ok, false);
  if (result.ok) return;

  assertUntrusted(result, {
    form: "murciélago",
    code: "UNSUPPORTED_STRESS_KIND",
  });
});

test("rejects inconsistent dependency output instead of trusting it", () => {
  const inconsistentWord: WeiweiSilabacionWordLike = {
    syllables: ["ca", "sa"],
    stress: "llana",
    tonic: 3,
    hiatuses: [],
    diphthongs: [],
    triphthongs: [],
  };
  const analyzer = createWeiweiSilabacionWordAnalyzer({
    createWord: () => inconsistentWord,
  });

  const result = analyzer.analyze("casa");

  assert.equal(result.ok, false);
  if (result.ok) return;

  assertUntrusted(result, {
    form: "casa",
    code: "INCONSISTENT_RESULT",
  });
});

test("rejects blank syllables instead of trusting whitespace as analysis", () => {
  const blankSyllableWord: WeiweiSilabacionWordLike = {
    syllables: [" ", "sa"],
    stress: "llana",
    tonic: 0,
    hiatuses: [],
    diphthongs: [],
    triphthongs: [],
  };
  const analyzer = createWeiweiSilabacionWordAnalyzer({
    createWord: () => blankSyllableWord,
  });

  const result = analyzer.analyze("casa");

  assert.equal(result.ok, false);
  if (result.ok) return;

  assertUntrusted(result, {
    form: "casa",
    code: "INCONSISTENT_RESULT",
  });
});

function assertUntrusted(
  result: UntrustedWordAnalysis,
  expected: { readonly form: string; readonly code: UntrustedWordAnalysis["error"]["code"] },
): void {
  assert.equal("syllables" in result, false);
  assert.equal(result.form, expected.form);
  assert.equal(result.error.code, expected.code);
  assert.equal(result.versions.adapter, versions.adapter);
  assert.equal(result.versions.library, versions.library);
}

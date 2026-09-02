import test from "node:test";
import assert from "node:assert/strict";

import type {
  TrustedWordAnalysis,
  WordAnalysisPort,
  WordAnalysisResult,
} from "../../ports/index.js";
import { createWeiweiSilabacionWordAnalyzer } from "../../infrastructure/weiwei-silabacion/word-analysis-adapter.js";
import {
  OCTONOL_METER_GOLD_FIXTURES,
  type OctonolMeterGoldExpected,
} from "./octonol-meter-fixtures.js";
import {
  createOctonolMeterValidator,
  toOctonolMeterDiagnostic,
  type OctonolMeterResult,
  type OctonolMeterVerdict,
} from "./octonol-meter.js";

const realValidator = createOctonolMeterValidator({
  analyzer: createWeiweiSilabacionWordAnalyzer(),
});

function assertExpected(result: OctonolMeterResult, expected: OctonolMeterGoldExpected): void {
  assert.equal(result.verdict, expected.verdict);

  if (expected.reasonCode !== undefined) {
    assert.ok(result.reason !== undefined, "expected a reason");
    assert.match(result.reason ?? "", new RegExp(expected.reasonCode));
  }

  if (expected.positionsToLastStress !== undefined) {
    assert.equal(result.positionsToLastStress, expected.positionsToLastStress);
  }

  if (expected.phoneticSyllableCount !== undefined) {
    assert.equal(result.phoneticSyllableCount, expected.phoneticSyllableCount);
  }

  if (expected.finalStressType !== undefined) {
    assert.equal(result.finalStressType, expected.finalStressType);
  }

  if (expected.lastStress !== undefined) {
    assert.equal(result.lastStress, expected.lastStress);
  }

  if (expected.segmentation !== undefined) {
    assert.equal(result.segmentation, expected.segmentation);
  }

  if (expected.sinalefas !== undefined) {
    assert.deepEqual(result.sinalefas, expected.sinalefas);
  }

  if (expected.doubtfulSinalefas !== undefined) {
    assert.deepEqual(result.doubtfulSinalefas, expected.doubtfulSinalefas);
  }

  if (expected.readings !== undefined) {
    assert.deepEqual(
      result.readings.map((reading) => reading.positionsToLastStress),
      expected.readings,
    );
  }

  if (expected.difference !== undefined) {
    assert.equal(result.difference, expected.difference);
  }
}

test("octonol gold fixtures classify valid, invalid and doubtful verses", () => {
  for (const fixture of OCTONOL_METER_GOLD_FIXTURES) {
    const result = realValidator.validate(fixture.verse);

    assertExpected(result, fixture.expected);
  }
});

test("octonol gold fixtures cover every required classification and stress type", () => {
  const verdicts = new Set<OctonolMeterVerdict>();
  const stressTypes = new Set<string>();
  const doubtfulFixtures: string[] = [];
  const appliedFixtures: string[] = [];

  for (const fixture of OCTONOL_METER_GOLD_FIXTURES) {
    verdicts.add(fixture.expected.verdict);

    if (fixture.expected.finalStressType !== undefined) {
      stressTypes.add(fixture.expected.finalStressType);
    }

    if ((fixture.expected.doubtfulSinalefas ?? []).length > 0) {
      doubtfulFixtures.push(fixture.id);
    }

    if ((fixture.expected.sinalefas ?? []).length > 0) {
      appliedFixtures.push(fixture.id);
    }
  }

  assert.deepEqual(verdicts, new Set(["VALIDO", "DUDOSO", "INVALIDO"]));
  assert.deepEqual(stressTypes, new Set(["AGUDA", "LLANA"]));
  assert.ok(doubtfulFixtures.length > 0, "a doubtful sinalefa fixture is required");
  assert.ok(appliedFixtures.length > 0, "a natural sinalefa fixture is required");
});

test("a doubtful sinalefa can never yield VALIDO", () => {
  for (const fixture of OCTONOL_METER_GOLD_FIXTURES) {
    const result = realValidator.validate(fixture.verse);

    if (result.doubtfulSinalefas.length > 0) {
      assert.notEqual(result.verdict, "VALIDO", fixture.id);
    }
  }
});

test("gold fixtures carry offset and segmentation trace that resolves to the verse", () => {
  for (const fixture of OCTONOL_METER_GOLD_FIXTURES) {
    const result = realValidator.validate(fixture.verse);

    if (result.verdict === "INVALIDO" && result.words.length === 0) {
      continue;
    }

    assert.ok(result.segmentation !== undefined, fixture.id);
    assert.ok(result.lastStress !== undefined, fixture.id);

    for (const word of result.words) {
      assert.equal(fixture.verse.slice(word.startOffset, word.endOffset), word.text, fixture.id);
      assert.equal(word.syllables.join(""), word.text, fixture.id);
      assert.ok(
        word.stressedSyllableIndex >= 0 && word.stressedSyllableIndex < word.syllables.length,
        fixture.id,
      );
    }
  }
});

test("toOctonolMeterDiagnostic maps the verdict into a candidate diagnostic", () => {
  const result = realValidator.validate("casa de la luna llena");
  const diagnostic = toOctonolMeterDiagnostic(result);

  assert.equal(diagnostic.validator, "octonol-meter");
  assert.equal(diagnostic.version, result.version);
  assert.equal(diagnostic.result, "VALIDO");
  assert.equal(diagnostic.evidence.pointer, "octonol-meter:casa de la luna llena");
  assert.equal(diagnostic.evidence.summary, "ca-sa-de-la-lu-na-LLE-na");
});

const trusted = (
  form: string,
  syllables: readonly string[],
  stressedSyllableIndex: number,
  stressKind: "aguda" | "llana",
): TrustedWordAnalysis => ({
  ok: true,
  form,
  syllables,
  stressedSyllableIndex,
  stressKind,
  phenomena: { diphthongs: [], hiatuses: [], triphthongs: [] },
  versions: { adapter: "fake/0.0.0", library: "fake/0.0.0" },
});

const fakeWordMap = new Map<string, TrustedWordAnalysis>([
  ["la", trusted("la", ["la"], 0, "aguda")],
  ["casa", trusted("casa", ["ca", "sa"], 0, "llana")],
  ["serena", trusted("serena", ["se", "re", "na"], 1, "llana")],
  ["ahora", trusted("ahora", ["a", "ho", "ra"], 1, "llana")],
]);

const fakeAnalyzer: WordAnalysisPort = Object.freeze({
  analyze(word: string): WordAnalysisResult {
    const known = fakeWordMap.get(word);

    if (known !== undefined) {
      return known;
    }

    return Object.freeze({
      ok: false as const,
      form: word,
      error: Object.freeze({ code: "LIBRARY_ERROR", message: "unknown word" }),
      versions: Object.freeze({ adapter: "fake/0.0.0", library: "fake/0.0.0" }),
    });
  },
});

test("an unanalyzable word rejects the verse without invented syllables", () => {
  const validator = createOctonolMeterValidator({ analyzer: fakeAnalyzer });
  const result = validator.validate("la casa extraña");

  assert.equal(result.verdict, "INVALIDO");
  assert.ok(result.reason !== undefined);
  assert.match(result.reason ?? "", /extraña/);
  assert.match(result.reason ?? "", /LIBRARY_ERROR/);
  assert.equal(result.segmentation, undefined);
  assert.deepEqual(result.readings, []);
});

test("an empty or non-letter verse is rejected as invalid", () => {
  const validator = createOctonolMeterValidator({ analyzer: fakeAnalyzer });
  const result = validator.validate("   ...   ");

  assert.equal(result.verdict, "INVALIDO");
  assert.match(result.reason ?? "", /no contiene palabras/);
});

test("a doubtful join is preserved with both readings and never becomes VALIDO", () => {
  const validator = createOctonolMeterValidator({ analyzer: fakeAnalyzer });
  const result = validator.validate("la casa serena; ahora");

  assert.equal(result.verdict, "DUDOSO");
  assert.deepEqual(result.doubtfulSinalefas, ["na_a"]);
  assert.deepEqual(
    result.readings.map((reading) => reading.positionsToLastStress),
    [8, 7],
  );
  assert.notEqual(result.verdict, "VALIDO");
});

import assert from "node:assert/strict";
import test from "node:test";

import {
  INITIAL_QUALITY_RUBRIC,
  scoreQualityDimensions,
  type QualityDimensionScore,
  type QualityRubric,
  type ValidationDiagnostic,
} from "./versioned-quality-rubric.js";

const completeScores = (): readonly QualityDimensionScore[] => [
  { dimension: "Naturalidad", note: 17, maximum: 20, confidence: 0.95 },
  { dimension: "Coherencia", note: 12, maximum: 15, confidence: 0.9 },
  { dimension: "Remate", note: 13, maximum: 15, confidence: 0.9 },
  { dimension: "Humor", note: 11, maximum: 15, confidence: 0.85 },
  { dimension: "Cantabilidad", note: 8, maximum: 10, confidence: 0.95 },
  { dimension: "Vocabulario", note: 9, maximum: 10, confidence: 0.9 },
  { dimension: "Variedad", note: 4, maximum: 5, confidence: 0.9 },
  { dimension: "Originalidad", note: 8, maximum: 10, confidence: 0.8 },
];

test.describe("versioned quality rubric", () => {
  test("calculates a weighted total and preserves each dimension's breakdown", () => {
    const result = scoreQualityDimensions(
      INITIAL_QUALITY_RUBRIC,
      completeScores(),
    );

    assert.equal(
      result.ok,
      true,
      "a complete set of scores should be scoreable",
    );
    if (!result.ok) return;

    assert.equal(result.value.total, 82);
    assert.equal(result.value.rubricVersion, INITIAL_QUALITY_RUBRIC.version);
    assert.deepEqual(result.value.breakdown, [
      {
        dimension: "Naturalidad",
        note: 17,
        maximum: 20,
        weight: 20,
        points: 17,
      },
      {
        dimension: "Coherencia",
        note: 12,
        maximum: 15,
        weight: 15,
        points: 12,
      },
      { dimension: "Remate", note: 13, maximum: 15, weight: 15, points: 13 },
      { dimension: "Humor", note: 11, maximum: 15, weight: 15, points: 11 },
      {
        dimension: "Cantabilidad",
        note: 8,
        maximum: 10,
        weight: 10,
        points: 8,
      },
      { dimension: "Vocabulario", note: 9, maximum: 10, weight: 10, points: 9 },
      { dimension: "Variedad", note: 4, maximum: 5, weight: 5, points: 4 },
      {
        dimension: "Originalidad",
        note: 8,
        maximum: 10,
        weight: 10,
        points: 8,
      },
    ]);
    assert.match(result.value.explanation, /17\/20/);
  });

  test("rounds fractional weighted points deterministically to the nearest integer", () => {
    const scores = completeScores().map((score) =>
      score.dimension === "Naturalidad" ? { ...score, note: 19 } : score,
    );

    const first = scoreQualityDimensions(INITIAL_QUALITY_RUBRIC, scores);
    const second = scoreQualityDimensions(INITIAL_QUALITY_RUBRIC, scores);

    assert.deepEqual(first, second);
    assert.equal(first.ok, true, "edge scores should remain scoreable");
    if (!first.ok) return;
    assert.equal(first.value.total, 84);
    assert.equal(first.value.breakdown[0]?.points, 19);
  });

  test("rejects scoring when a required dimension is missing", () => {
    const scoresWithoutHumor = completeScores().filter(
      (score) => score.dimension !== "Humor",
    );

    const result = scoreQualityDimensions(
      INITIAL_QUALITY_RUBRIC,
      scoresWithoutHumor,
    );

    assert.equal(result.ok, false, "missing dimension should prevent scoring");
    if (result.ok)
      throw new Error("Expected scoring to fail for missing dimension");

    assert.equal(result.error.code, "MISSING_DIMENSIONS");
    assert.ok(
      result.error.missingDimensions.includes("Humor"),
      "error should list Humor as missing",
    );
  });

  test("rejects scoring when multiple required dimensions are missing", () => {
    const incompleteScores = completeScores().filter(
      (score) =>
        score.dimension !== "Humor" && score.dimension !== "Originalidad",
    );

    const result = scoreQualityDimensions(
      INITIAL_QUALITY_RUBRIC,
      incompleteScores,
    );

    assert.equal(
      result.ok,
      false,
      "multiple missing dimensions should prevent scoring",
    );
    if (result.ok)
      throw new Error(
        "Expected scoring to fail for multiple missing dimensions",
      );

    assert.equal(result.error.code, "MISSING_DIMENSIONS");
    assert.deepEqual(
      [...result.error.missingDimensions].sort(),
      ["Humor", "Originalidad"].sort(),
    );
  });

  test("rejects scoring when a dimension has confidence below policy threshold", () => {
    const scoresWithLowConfidence = completeScores().map((score) =>
      score.dimension === "Originalidad"
        ? { ...score, confidence: 0.3 }
        : score,
    );

    const result = scoreQualityDimensions(
      INITIAL_QUALITY_RUBRIC,
      scoresWithLowConfidence,
    );

    assert.equal(result.ok, false, "low confidence should prevent scoring");
    if (result.ok)
      throw new Error("Expected scoring to fail for low confidence");

    assert.equal(result.error.code, "LOW_CONFIDENCE");
    assert.ok(
      result.error.dimensions.some((d) => d.dimension === "Originalidad"),
      "error should list Originalidad as low confidence",
    );
  });

  test("rejects scoring when multiple dimensions have low confidence", () => {
    const scoresWithLowConfidence = completeScores().map((score) =>
      score.dimension === "Originalidad" || score.dimension === "Humor"
        ? { ...score, confidence: 0.2 }
        : score,
    );

    const result = scoreQualityDimensions(
      INITIAL_QUALITY_RUBRIC,
      scoresWithLowConfidence,
    );

    assert.equal(
      result.ok,
      false,
      "multiple low confidence dimensions should prevent scoring",
    );
    if (result.ok)
      throw new Error("Expected scoring to fail for multiple low confidence");

    assert.equal(result.error.code, "LOW_CONFIDENCE");
    const reportedDimensions = result.error.dimensions
      .map((d) => d.dimension)
      .sort();
    assert.deepEqual(reportedDimensions, ["Humor", "Originalidad"]);
  });

  test("rejects a rubric whose weights do not sum to 100", () => {
    const invalidRubric: QualityRubric = {
      version: "test-invalid-weights",
      dimensions: INITIAL_QUALITY_RUBRIC.dimensions.map((dim) => ({
        ...dim,
        weight: dim.weight + 1,
      })),
      confidenceMinimum: INITIAL_QUALITY_RUBRIC.confidenceMinimum,
    };

    const result = scoreQualityDimensions(invalidRubric, completeScores());

    assert.equal(result.ok, false, "invalid weights should prevent scoring");
    if (result.ok)
      throw new Error("Expected scoring to fail for invalid weights");

    assert.equal(result.error.code, "INVALID_WEIGHTS");
    assert.equal(result.error.expectedTotal, 100);
    assert.notEqual(result.error.actualTotal, 100);
  });

  test("produces deterministic results for the same rubric version and input", () => {
    const scores = completeScores();

    const first = scoreQualityDimensions(INITIAL_QUALITY_RUBRIC, scores);
    const second = scoreQualityDimensions(INITIAL_QUALITY_RUBRIC, scores);

    assert.deepEqual(
      first,
      second,
      "same input and rubric must produce identical output",
    );
  });

  test("produces different totals when rubric version changes weights", () => {
    const shiftedRubric: QualityRubric = {
      version: "test-shifted-weights",
      dimensions: INITIAL_QUALITY_RUBRIC.dimensions.map((dim) =>
        dim.dimension === "Humor"
          ? { ...dim, weight: dim.weight + 10 }
          : dim.dimension === "Naturalidad"
            ? { ...dim, weight: dim.weight - 10 }
            : dim,
      ),
      confidenceMinimum: INITIAL_QUALITY_RUBRIC.confidenceMinimum,
    };

    const scores = completeScores();
    const originalResult = scoreQualityDimensions(
      INITIAL_QUALITY_RUBRIC,
      scores,
    );
    const shiftedResult = scoreQualityDimensions(shiftedRubric, scores);

    assert.equal(originalResult.ok, true);
    assert.equal(shiftedResult.ok, true);
    if (!originalResult.ok || !shiftedResult.ok) {
      throw new Error("Both rubrics should produce valid scores");
    }

    assert.notEqual(
      originalResult.value.total,
      shiftedResult.value.total,
      "different weights should produce different totals",
    );
    assert.equal(
      originalResult.value.rubricVersion,
      INITIAL_QUALITY_RUBRIC.version,
    );
    assert.equal(shiftedResult.value.rubricVersion, shiftedRubric.version);
  });

  test("rejects scoring when a hard validator returned INVALIDO", () => {
    const diagnostics: ValidationDiagnostic[] = [
      { validator: "metric", version: "metric-0.1.0", result: "INVALIDO" },
    ];

    const result = scoreQualityDimensions(
      INITIAL_QUALITY_RUBRIC,
      completeScores(),
      diagnostics,
    );

    assert.equal(result.ok, false, "INVALIDO validator should prevent scoring");
    if (result.ok)
      throw new Error("Expected scoring to fail for INVALIDO validator");

    assert.equal(result.error.code, "HARD_VALIDATION_NOT_PASSED");
    assert.ok(
      result.error.diagnostics.some((d) => d.result === "INVALIDO"),
      "error should list the INVALIDO diagnostic",
    );
  });

  test("rejects scoring when a hard validator returned DUDOSO", () => {
    const diagnostics: ValidationDiagnostic[] = [
      { validator: "metric", version: "metric-0.1.0", result: "DUDOSO" },
    ];

    const result = scoreQualityDimensions(
      INITIAL_QUALITY_RUBRIC,
      completeScores(),
      diagnostics,
    );

    assert.equal(result.ok, false, "DUDOSO validator should prevent scoring");
    if (result.ok)
      throw new Error("Expected scoring to fail for DUDOSO validator");

    assert.equal(result.error.code, "HARD_VALIDATION_NOT_PASSED");
    assert.ok(
      result.error.diagnostics.some((d) => d.result === "DUDOSO"),
      "error should list the DUDOSO diagnostic",
    );
  });

  test("rejects scoring when multiple validators include a DUDOSO result", () => {
    const diagnostics: ValidationDiagnostic[] = [
      { validator: "metric", version: "metric-0.1.0", result: "VALIDO" },
      { validator: "rhyme", version: "rhyme-0.1.0", result: "DUDOSO" },
      { validator: "lexicon", version: "lexicon-0.1.0", result: "VALIDO" },
    ];

    const result = scoreQualityDimensions(
      INITIAL_QUALITY_RUBRIC,
      completeScores(),
      diagnostics,
    );

    assert.equal(
      result.ok,
      false,
      "mixed validation with DUDOSO should prevent scoring",
    );
    if (result.ok)
      throw new Error("Expected scoring to fail for mixed validation results");

    assert.equal(result.error.code, "HARD_VALIDATION_NOT_PASSED");
    assert.equal(
      result.error.diagnostics.length,
      1,
      "only the non-VALIDO diagnostic should be reported",
    );
    assert.equal(result.error.diagnostics[0]?.validator, "rhyme");
  });

  test("rejects scoring when multiple validators include an INVALIDO result", () => {
    const diagnostics: ValidationDiagnostic[] = [
      { validator: "metric", version: "metric-0.1.0", result: "VALIDO" },
      { validator: "rhyme", version: "rhyme-0.1.0", result: "INVALIDO" },
    ];

    const result = scoreQualityDimensions(
      INITIAL_QUALITY_RUBRIC,
      completeScores(),
      diagnostics,
    );

    assert.equal(
      result.ok,
      false,
      "mixed validation with INVALIDO should prevent scoring",
    );
    if (result.ok)
      throw new Error("Expected scoring to fail for mixed validation results");

    assert.equal(result.error.code, "HARD_VALIDATION_NOT_PASSED");
    assert.equal(
      result.error.diagnostics.length,
      1,
      "only the non-VALIDO diagnostic should be reported",
    );
    assert.equal(result.error.diagnostics[0]?.validator, "rhyme");
  });

  test("accepts scoring when all hard validators are VALIDO", () => {
    const diagnostics: ValidationDiagnostic[] = [
      { validator: "metric", version: "metric-0.1.0", result: "VALIDO" },
      { validator: "rhyme", version: "rhyme-0.1.0", result: "VALIDO" },
    ];

    const result = scoreQualityDimensions(
      INITIAL_QUALITY_RUBRIC,
      completeScores(),
      diagnostics,
    );

    assert.equal(result.ok, true, "all VALIDO validators should allow scoring");
    if (!result.ok) return;

    assert.equal(result.value.total, 82);
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { applyQualityScoring, type QuatrainCandidate } from "./index.js";
import {
  INITIAL_QUALITY_RUBRIC,
  type QualityDimensionScore,
  type QualityRubric,
  type ValidationDiagnostic,
} from "../../scoring/versioned-quality-rubric.js";
import { candidateInState } from "./test-fixtures.js";

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

const allValidDiagnostics = (): readonly ValidationDiagnostic[] => [
  { validator: "metric", version: "metric-0.1.0", result: "VALIDO" },
  { validator: "rhyme", version: "rhyme-0.1.0", result: "VALIDO" },
];

describe("scoring integration", () => {
  describe("successful scoring", () => {
    it("transitions a VALIDO candidate to PUNTUADO with score, breakdown and rubric version", () => {
      const candidate = candidateInState("VALIDO");

      const result = applyQualityScoring(
        candidate,
        INITIAL_QUALITY_RUBRIC,
        completeScores(),
        allValidDiagnostics(),
      );

      assert.equal(
        result.ok,
        true,
        "VALIDO candidate with complete scores should be scoreable",
      );
      if (!result.ok) throw new Error("Expected successful scoring");

      assert.equal(result.value.state, "PUNTUADO");
      assert.equal(
        result.value.score?.rubricVersion,
        INITIAL_QUALITY_RUBRIC.version,
      );
      assert.equal(result.value.score?.score, 82);
      assert.equal(result.value.score?.breakdown.length, 8);
      assert.equal(result.value.events.at(-1)?.type, "SCORE_RECORDED");
      assert.equal(Object.isFrozen(result.value), true);
      assert.equal(Object.isFrozen(result.value.score), true);
    });

    it("preserves the rubric version in the recorded score for traceability", () => {
      const candidate = candidateInState("VALIDO");

      const result = applyQualityScoring(
        candidate,
        INITIAL_QUALITY_RUBRIC,
        completeScores(),
        allValidDiagnostics(),
      );

      assert.equal(result.ok, true);
      if (!result.ok) throw new Error("Expected successful scoring");

      assert.equal(
        result.value.score?.rubricVersion,
        INITIAL_QUALITY_RUBRIC.version,
      );
      assert.equal(
        result.value.events.at(-1)?.rubricVersion,
        INITIAL_QUALITY_RUBRIC.version,
      );
    });

    it("records each dimension's points and maximum in the breakdown", () => {
      const candidate = candidateInState("VALIDO");

      const result = applyQualityScoring(
        candidate,
        INITIAL_QUALITY_RUBRIC,
        completeScores(),
        allValidDiagnostics(),
      );

      assert.equal(result.ok, true);
      if (!result.ok) throw new Error("Expected successful scoring");

      const breakdown = result.value.score?.breakdown;
      assert.ok(breakdown);
      assert.equal(breakdown[0]?.dimension, "Naturalidad");
      assert.equal(breakdown[0]?.points, 17);
      assert.equal(breakdown[0]?.maximum, 20);
    });
  });

  describe("state eligibility", () => {
    it("rejects scoring when the candidate has not passed hard validation", () => {
      const blockedStates: readonly QuatrainCandidate["state"][] = [
        "GENERADO",
        "VALIDACION_PENDIENTE",
        "RECHAZADO",
      ];

      for (const state of blockedStates) {
        const candidate = candidateInState(state);
        const result = applyQualityScoring(
          candidate,
          INITIAL_QUALITY_RUBRIC,
          completeScores(),
          allValidDiagnostics(),
        );

        assert.equal(result.ok, false, `${state} should reject scoring`);
        if (result.ok) continue;

        assert.equal(result.error.code, "STATE_NOT_ELIGIBLE");
        assert.equal(result.error.currentState, state);
      }
    });

    it("rejects scoring when the candidate is already PUNTUADO", () => {
      const candidate = candidateInState("PUNTUADO");
      const result = applyQualityScoring(
        candidate,
        INITIAL_QUALITY_RUBRIC,
        completeScores(),
        allValidDiagnostics(),
      );

      assert.equal(
        result.ok,
        false,
        "PUNTUADO candidate should not be scored again",
      );
      if (result.ok)
        throw new Error("Expected scoring to fail for PUNTUADO candidate");

      assert.equal(result.error.code, "STATE_NOT_ELIGIBLE");
      assert.equal(result.error.currentState, "PUNTUADO");
    });

    it("rejects scoring when the candidate is already SELECCIONADO", () => {
      const candidate = candidateInState("SELECCIONADO");
      const result = applyQualityScoring(
        candidate,
        INITIAL_QUALITY_RUBRIC,
        completeScores(),
        allValidDiagnostics(),
      );

      assert.equal(
        result.ok,
        false,
        "SELECCIONADO candidate should not be scored again",
      );
      if (result.ok)
        throw new Error("Expected scoring to fail for SELECCIONADO candidate");

      assert.equal(result.error.code, "STATE_NOT_ELIGIBLE");
      assert.equal(result.error.currentState, "SELECCIONADO");
    });
  });

  describe("scoring validation", () => {
    it("rejects scoring when a required quality dimension is missing", () => {
      const candidate = candidateInState("VALIDO");
      const scoresWithoutHumor = completeScores().filter(
        (score) => score.dimension !== "Humor",
      );

      const result = applyQualityScoring(
        candidate,
        INITIAL_QUALITY_RUBRIC,
        scoresWithoutHumor,
        allValidDiagnostics(),
      );

      assert.equal(
        result.ok,
        false,
        "missing dimension should prevent scoring",
      );
      if (result.ok)
        throw new Error("Expected scoring to fail for missing dimension");

      assert.equal(result.error.code, "MISSING_DIMENSIONS");
      assert.ok(
        result.error.missingDimensions.includes("Humor"),
        "error should list Humor as missing",
      );
      assert.equal(
        candidate.state,
        "VALIDO",
        "candidate state should not change",
      );
    });

    it("rejects scoring when a dimension has low confidence", () => {
      const candidate = candidateInState("VALIDO");
      const scoresWithLowConfidence = completeScores().map((score) =>
        score.dimension === "Originalidad"
          ? { ...score, confidence: 0.3 }
          : score,
      );

      const result = applyQualityScoring(
        candidate,
        INITIAL_QUALITY_RUBRIC,
        scoresWithLowConfidence,
        allValidDiagnostics(),
      );

      assert.equal(result.ok, false, "low confidence should prevent scoring");
      if (result.ok)
        throw new Error("Expected scoring to fail for low confidence");

      assert.equal(result.error.code, "LOW_CONFIDENCE");
      assert.equal(
        candidate.state,
        "VALIDO",
        "candidate state should not change",
      );
    });

    it("rejects scoring when hard validation diagnostics include a non-VALIDO result", () => {
      const candidate = candidateInState("VALIDO");
      const diagnostics: readonly ValidationDiagnostic[] = [
        { validator: "metric", version: "metric-0.1.0", result: "VALIDO" },
        { validator: "rhyme", version: "rhyme-0.1.0", result: "DUDOSO" },
      ];

      const result = applyQualityScoring(
        candidate,
        INITIAL_QUALITY_RUBRIC,
        completeScores(),
        diagnostics,
      );

      assert.equal(
        result.ok,
        false,
        "DUDOSO diagnostic should prevent scoring",
      );
      if (result.ok)
        throw new Error("Expected scoring to fail for DUDOSO diagnostic");

      assert.equal(result.error.code, "HARD_VALIDATION_NOT_PASSED");
      assert.equal(
        candidate.state,
        "VALIDO",
        "candidate state should not change",
      );
    });

    it("rejects scoring when rubric weights do not sum to 100", () => {
      const candidate = candidateInState("VALIDO");
      const invalidRubric: QualityRubric = {
        version: "test-invalid-weights",
        dimensions: INITIAL_QUALITY_RUBRIC.dimensions.map((dim) => ({
          ...dim,
          weight: dim.weight + 1,
        })),
        confidenceMinimum: INITIAL_QUALITY_RUBRIC.confidenceMinimum,
      };

      const result = applyQualityScoring(
        candidate,
        invalidRubric,
        completeScores(),
        allValidDiagnostics(),
      );

      assert.equal(result.ok, false, "invalid weights should prevent scoring");
      if (result.ok)
        throw new Error("Expected scoring to fail for invalid weights");

      assert.equal(result.error.code, "INVALID_WEIGHTS");
      assert.equal(
        candidate.state,
        "VALIDO",
        "candidate state should not change",
      );
    });
  });
});

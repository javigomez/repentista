/**
 * Versioned quality rubric for deterministic scoring of soft quality dimensions.
 *
 * This module is pure: it does not call any LLM, does not access the filesystem,
 * and produces deterministic results for the same input and rubric version.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QualityRubricDimension {
  readonly dimension: string;
  readonly weight: number;
  readonly maximum: number;
}

export interface QualityRubric {
  readonly version: string;
  readonly dimensions: readonly QualityRubricDimension[];
  readonly confidenceMinimum: number;
}

export interface QualityDimensionScore {
  readonly dimension: string;
  readonly note: number;
  readonly maximum: number;
  readonly confidence: number;
}

export interface ValidationDiagnostic {
  readonly validator: string;
  readonly version: string;
  readonly result: "VALIDO" | "DUDOSO" | "INVALIDO";
}

// ---------------------------------------------------------------------------
// Result types
// ---------------------------------------------------------------------------

export interface ScoreBreakdownEntry {
  readonly dimension: string;
  readonly note: number;
  readonly maximum: number;
  readonly weight: number;
  readonly points: number;
}

export interface ScoreSuccess {
  readonly total: number;
  readonly rubricVersion: string;
  readonly breakdown: readonly ScoreBreakdownEntry[];
  readonly explanation: string;
}

export interface MissingDimensionsError {
  readonly code: "MISSING_DIMENSIONS";
  readonly missingDimensions: readonly string[];
}

export interface LowConfidenceDimension {
  readonly dimension: string;
  readonly confidence: number;
}

export interface LowConfidenceError {
  readonly code: "LOW_CONFIDENCE";
  readonly dimensions: readonly LowConfidenceDimension[];
}

export interface InvalidWeightsError {
  readonly code: "INVALID_WEIGHTS";
  readonly expectedTotal: number;
  readonly actualTotal: number;
}

export interface HardValidationNotPassedError {
  readonly code: "HARD_VALIDATION_NOT_PASSED";
  readonly diagnostics: readonly ValidationDiagnostic[];
}

export type ScoringError =
  | MissingDimensionsError
  | LowConfidenceError
  | InvalidWeightsError
  | HardValidationNotPassedError;

export type ScoringResult =
  | { readonly ok: true; readonly value: ScoreSuccess }
  | { readonly ok: false; readonly error: ScoringError };

// ---------------------------------------------------------------------------
// Initial rubric (weights must sum to 100)
// ---------------------------------------------------------------------------

export const INITIAL_QUALITY_RUBRIC: QualityRubric = Object.freeze({
  version: "quality-rubric-0.1.0",
  dimensions: Object.freeze([
    Object.freeze({ dimension: "Naturalidad", weight: 20, maximum: 20 }),
    Object.freeze({ dimension: "Coherencia", weight: 15, maximum: 15 }),
    Object.freeze({ dimension: "Remate", weight: 15, maximum: 15 }),
    Object.freeze({ dimension: "Humor", weight: 15, maximum: 15 }),
    Object.freeze({ dimension: "Cantabilidad", weight: 10, maximum: 10 }),
    Object.freeze({ dimension: "Vocabulario", weight: 10, maximum: 10 }),
    Object.freeze({ dimension: "Variedad", weight: 5, maximum: 5 }),
    Object.freeze({ dimension: "Originalidad", weight: 10, maximum: 10 }),
  ]),
  confidenceMinimum: 0.5,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const roundToNearestInteger = (value: number): number => Math.round(value);

const buildExplanation = (breakdown: readonly ScoreBreakdownEntry[]): string =>
  breakdown
    .map(
      (entry) =>
        `${entry.dimension}: ${entry.note}/${entry.maximum} → ${entry.points} puntos (peso ${entry.weight}%)`,
    )
    .join("; ");

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Calculates a deterministic weighted score from quality dimension evaluations.
 *
 * @param rubric - Versioned rubric with dimensions, weights and confidence policy.
 * @param scores - Per-dimension evaluations with note, maximum and confidence.
 * @param validationDiagnostics - Optional hard validation diagnostics. When provided,
 *   all must be "VALIDO" for scoring to proceed.
 * @returns A result with total, breakdown and explanation on success, or a typed error.
 */
export function scoreQualityDimensions(
  rubric: QualityRubric,
  scores: readonly QualityDimensionScore[],
  validationDiagnostics?: readonly ValidationDiagnostic[],
): ScoringResult {
  // 1. Check hard validation diagnostics (if provided)
  if (validationDiagnostics !== undefined && validationDiagnostics.length > 0) {
    const nonValidDiagnostics = validationDiagnostics.filter(
      (diagnostic) => diagnostic.result !== "VALIDO",
    );

    if (nonValidDiagnostics.length > 0) {
      return Object.freeze({
        ok: false as const,
        error: Object.freeze({
          code: "HARD_VALIDATION_NOT_PASSED" as const,
          diagnostics: Object.freeze(nonValidDiagnostics),
        }),
      });
    }
  }

  // 2. Check that weights sum to 100
  const weightTotal = rubric.dimensions.reduce(
    (sum, dim) => sum + dim.weight,
    0,
  );
  if (weightTotal !== 100) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "INVALID_WEIGHTS" as const,
        expectedTotal: 100,
        actualTotal: weightTotal,
      }),
    });
  }

  // 3. Check that all required dimensions are present
  const scoreMap = new Map(scores.map((score) => [score.dimension, score]));
  const missingDimensions = rubric.dimensions
    .filter((dim) => !scoreMap.has(dim.dimension))
    .map((dim) => dim.dimension);

  if (missingDimensions.length > 0) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "MISSING_DIMENSIONS" as const,
        missingDimensions: Object.freeze(missingDimensions),
      }),
    });
  }

  // 4. Check confidence thresholds
  const lowConfidenceDimensions = scores
    .filter((score) => score.confidence < rubric.confidenceMinimum)
    .map((score) =>
      Object.freeze({
        dimension: score.dimension,
        confidence: score.confidence,
      }),
    );

  if (lowConfidenceDimensions.length > 0) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "LOW_CONFIDENCE" as const,
        dimensions: Object.freeze(lowConfidenceDimensions),
      }),
    });
  }

  // 5. Calculate weighted breakdown
  const breakdown: ScoreBreakdownEntry[] = rubric.dimensions.map((dim) => {
    const score = scoreMap.get(dim.dimension)!;
    const weightedPoints = (score.note / score.maximum) * dim.weight;
    return Object.freeze({
      dimension: dim.dimension,
      note: score.note,
      maximum: score.maximum,
      weight: dim.weight,
      points: roundToNearestInteger(weightedPoints),
    });
  });

  // 6. Calculate total
  const total = breakdown.reduce((sum, entry) => sum + entry.points, 0);

  // 7. Build explanation
  const explanation = buildExplanation(breakdown);

  return Object.freeze({
    ok: true as const,
    value: Object.freeze({
      total,
      rubricVersion: rubric.version,
      breakdown: Object.freeze(breakdown),
      explanation,
    }),
  });
}

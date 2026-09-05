import type { VerseSlot } from "../../domain/quatrain-candidate/index.js";
import type { StructuredLlmPrompt } from "../../ports/structured-llm-generation/index.js";

// ---------------------------------------------------------------------------
// Soft-quality dimensions
// ---------------------------------------------------------------------------

export const SOFT_QUALITY_DIMENSIONS = Object.freeze([
  "NATURALIDAD",
  "RIPIO",
  "COHERENCIA",
  "HUMOR",
  "PUNCHLINE",
  "VOCABULARY",
] as const);

export type SoftQualityDimension = (typeof SOFT_QUALITY_DIMENSIONS)[number];

const DIMENSION_LABELS: Readonly<Record<SoftQualityDimension, string>> = Object.freeze({
  NATURALIDAD: "naturalidad",
  RIPIO: "ripio",
  COHERENCIA: "coherencia",
  HUMOR: "humor",
  PUNCHLINE: "remate",
  VOCABULARY: "vocabulario",
});

const DIMENSION_SET: ReadonlySet<SoftQualityDimension> = new Set(SOFT_QUALITY_DIMENSIONS);

// ---------------------------------------------------------------------------
// Diagnosis
// ---------------------------------------------------------------------------

export interface DiagnosisEvidence {
  readonly pointer: string;
  readonly summary: string;
}

export interface SoftQualityDiagnosis {
  readonly code: string;
  readonly message: string;
  readonly evidence: readonly DiagnosisEvidence[];
}

// ---------------------------------------------------------------------------
// Invariants
// ---------------------------------------------------------------------------

export interface RepairInvariants {
  readonly finalWords: Readonly<Record<VerseSlot, string>>;
  readonly rhymeScheme: string;
  readonly metricPositions: number;
}

// ---------------------------------------------------------------------------
// Request DTO
// ---------------------------------------------------------------------------

export interface SoftQualityRepairRequest {
  readonly candidateId: string;
  readonly dimension: SoftQualityDimension;
  readonly diagnosis: SoftQualityDiagnosis;
  readonly editableSlots: readonly VerseSlot[];
  readonly immutableSlots: readonly VerseSlot[];
  readonly invariants: RepairInvariants;
  readonly attempt: number;
  readonly maxAttempts: number;
}

/** Builds the versioned, dimension-specific instruction sent to an authoring model. */
export function createSoftQualityRepairPrompt(
  request: SoftQualityRepairRequest,
): StructuredLlmPrompt {
  const dimension = DIMENSION_LABELS[request.dimension];
  const editable = request.editableSlots.join(", ");
  const immutable = request.immutableSlots.join(", ");

  return Object.freeze({
    id: `repair-${dimension}`,
    version: "0.1.0",
    messages: Object.freeze([
      Object.freeze({
        role: "system" as const,
        content: `Repara únicamente el defecto de ${dimension}. Conserva todas las restricciones duras.`,
      }),
      Object.freeze({
        role: "user" as const,
        content:
          `Diagnóstico: ${request.diagnosis.message}\n` +
          `Evidencias: ${request.diagnosis.evidence.map((evidence) => `${evidence.pointer}: ${evidence.summary}`).join("; ")}\n` +
          `Edita solo ${editable}. No modificar ${immutable}. Conserva las palabras finales, ` +
          `el esquema ${request.invariants.rhymeScheme} y ${request.invariants.metricPositions} posiciones métricas.`,
      }),
    ]),
  });
}

// ---------------------------------------------------------------------------
// Request creation errors
// ---------------------------------------------------------------------------

export type SoftQualityRepairRequestError =
  | {
      readonly code: "INVALID_EDIT_SCOPE";
      readonly message: string;
    }
  | {
      readonly code: "INVALID_HARD_INVARIANT";
      readonly message: string;
    }
  | {
      readonly code: "MIXED_DIMENSIONS";
      readonly message: string;
    }
  | {
      readonly code: "ATTEMPT_EXCEEDED";
      readonly message: string;
    };

export type SoftQualityRepairRequestResult =
  | { readonly ok: true; readonly value: SoftQualityRepairRequest }
  | { readonly ok: false; readonly error: SoftQualityRepairRequestError };

// ---------------------------------------------------------------------------
// Supported hard invariants
// ---------------------------------------------------------------------------

const SUPPORTED_RHYME_SCHEME = "0-A-0-A";
const SUPPORTED_METRIC_POSITIONS = 7;

// ---------------------------------------------------------------------------
// createSoftQualityRepairRequest
// ---------------------------------------------------------------------------

export function createSoftQualityRepairRequest(
  input: SoftQualityRepairRequest,
): SoftQualityRepairRequestResult {
  // 1. Attempt budget
  if (input.attempt > input.maxAttempts) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "ATTEMPT_EXCEEDED" as const,
        message: `El intento ${input.attempt} excede el máximo permitido (${input.maxAttempts}).`,
      }),
    });
  }

  // 2. Dimension must be a single recognized soft-quality dimension
  if (!DIMENSION_SET.has(input.dimension)) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "MIXED_DIMENSIONS" as const,
        message: `La dimensión "${input.dimension}" no es una dimensión blanda reconocida.`,
      }),
    });
  }

  // 3. Diagnosis evidence must not reference multiple dimensions
  const mixedDimensionEvidence = findMixedDimensionEvidence(input.diagnosis, input.dimension);

  if (mixedDimensionEvidence !== undefined) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "MIXED_DIMENSIONS" as const,
        message:
          `El diagnóstico mezcla evidencias de distintas dimensiones: ` +
          `la evidencia en "${mixedDimensionEvidence.pointer}" no pertenece a ${input.dimension}.`,
      }),
    });
  }

  // 4. Editable slots must not be empty
  if (input.editableSlots.length === 0) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "INVALID_EDIT_SCOPE" as const,
        message: "Los slots editables no pueden estar vacíos.",
      }),
    });
  }

  // 5. Editable and immutable slots must not overlap
  const immutableSet = new Set(input.immutableSlots);
  const overlap = input.editableSlots.filter((slot) => immutableSet.has(slot));

  if (overlap.length > 0) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "INVALID_EDIT_SCOPE" as const,
        message:
          `Los slots editables e inmutables se solapan: ${overlap.join(", ")}. ` +
          "Un slot no puede ser editable e inmutable a la vez.",
      }),
    });
  }

  // 6. Hard invariants must match supported values
  if (input.invariants.rhymeScheme !== SUPPORTED_RHYME_SCHEME) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "INVALID_HARD_INVARIANT" as const,
        message:
          `El esquema de rima "${input.invariants.rhymeScheme}" no es compatible. ` +
          `Solo se admite "${SUPPORTED_RHYME_SCHEME}".`,
      }),
    });
  }

  if (input.invariants.metricPositions !== SUPPORTED_METRIC_POSITIONS) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "INVALID_HARD_INVARIANT" as const,
        message:
          `Las posiciones métricas (${input.invariants.metricPositions}) no son compatibles. ` +
          `Solo se admiten ${SUPPORTED_METRIC_POSITIONS}.`,
      }),
    });
  }

  // All validations passed — return a frozen copy
  return Object.freeze({
    ok: true as const,
    value: Object.freeze({
      candidateId: input.candidateId,
      dimension: input.dimension,
      diagnosis: Object.freeze({
        code: input.diagnosis.code,
        message: input.diagnosis.message,
        evidence: Object.freeze(
          input.diagnosis.evidence.map((e) =>
            Object.freeze({ pointer: e.pointer, summary: e.summary }),
          ),
        ),
      }),
      editableSlots: Object.freeze([...input.editableSlots]),
      immutableSlots: Object.freeze([...input.immutableSlots]),
      invariants: Object.freeze({
        finalWords: Object.freeze({ ...input.invariants.finalWords }),
        rhymeScheme: input.invariants.rhymeScheme,
        metricPositions: input.invariants.metricPositions,
      }),
      attempt: input.attempt,
      maxAttempts: input.maxAttempts,
    }),
  });
}

// ---------------------------------------------------------------------------
// Dimension pointer prefix mapping
// ---------------------------------------------------------------------------

const DIMENSION_POINTER_PREFIXES: Readonly<Record<SoftQualityDimension, readonly string[]>> =
  Object.freeze({
    NATURALIDAD: Object.freeze(["/assessment/naturalness"]),
    RIPIO: Object.freeze(["/assessment/ripio"]),
    COHERENCIA: Object.freeze(["/assessment/coherence"]),
    HUMOR: Object.freeze(["/assessment/humor"]),
    PUNCHLINE: Object.freeze(["/assessment/punchline"]),
    VOCABULARY: Object.freeze(["/assessment/vocabulary"]),
  });

function findMixedDimensionEvidence(
  diagnosis: SoftQualityDiagnosis,
  expectedDimension: SoftQualityDimension,
): DiagnosisEvidence | undefined {
  const prefixes = DIMENSION_POINTER_PREFIXES[expectedDimension];

  for (const evidence of diagnosis.evidence) {
    const belongsToExpected = prefixes.some((prefix) => evidence.pointer.startsWith(prefix));

    if (!belongsToExpected) {
      return evidence;
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Repair execution types
// ---------------------------------------------------------------------------

export interface RepairCandidate {
  readonly id: string;
  readonly verses: Readonly<Record<VerseSlot, string>>;
}

export interface RepairVariant {
  readonly verses: Readonly<Record<VerseSlot, string>>;
}

export type VariantGenerator = (
  request: SoftQualityRepairRequest,
  candidate: RepairCandidate,
) => Promise<readonly RepairVariant[]>;

export interface HardValidationResult {
  readonly ok: boolean;
  readonly error?: { readonly code: string; readonly message: string };
}

export type HardValidator = (variant: RepairVariant) => Promise<HardValidationResult>;

export interface DimensionEvaluationResult {
  readonly note: number;
  readonly confidence: number;
}

export type DimensionEvaluator = (
  variant: RepairVariant,
) => Promise<DimensionEvaluationResult>;

export interface ConstrainedRepairInput {
  readonly request: SoftQualityRepairRequest;
  readonly candidate: RepairCandidate;
  readonly variantGenerator: VariantGenerator;
  readonly hardValidator: HardValidator;
  readonly dimensionEvaluator: DimensionEvaluator;
}

// ---------------------------------------------------------------------------
// Repair execution result types
// ---------------------------------------------------------------------------

export type RejectedVariantReason =
  | "IMMUTABLE_SLOT_CHANGED"
  | "HARD_VALIDATION_FAILED";

export interface RejectedVariant {
  readonly variant: RepairVariant;
  readonly reason: RejectedVariantReason;
  readonly changedSlots?: readonly VerseSlot[];
  readonly hardError?: { readonly code: string; readonly message: string };
}

export interface RepairAttempt {
  readonly variant: RepairVariant;
  readonly improved: boolean;
  readonly dimensionNote?: number;
  readonly rejectionReason?: RejectedVariantReason;
}

export type RepairOutcome = "VARIANT_ACCEPTED" | "ORIGINAL_PRESERVED";

export interface AcceptedVariantInfo {
  readonly branch: RepairCandidate;
  readonly verses: Readonly<Record<VerseSlot, string>>;
  readonly dimensionNote: number;
  readonly dimensionConfidence: number;
}

export interface ConstrainedRepairResult {
  readonly original: RepairCandidate;
  readonly outcome: RepairOutcome;
  readonly acceptedVariant?: AcceptedVariantInfo;
  readonly rejectedVariants: readonly RejectedVariant[];
  readonly attempts: readonly RepairAttempt[];
}

export type ConstrainedRepairExecutionResult =
  | { readonly ok: true; readonly value: ConstrainedRepairResult }
  | { readonly ok: false; readonly error: { readonly code: string; readonly message: string } };

// ---------------------------------------------------------------------------
// executeConstrainedRepair
// ---------------------------------------------------------------------------

export async function executeConstrainedRepair(
  input: ConstrainedRepairInput,
): Promise<ConstrainedRepairExecutionResult> {
  const { request, candidate, variantGenerator, hardValidator, dimensionEvaluator } = input;

  // Generate variants
  const variants = await variantGenerator(request, candidate);

  const rejectedVariants: RejectedVariant[] = [];
  const attempts: RepairAttempt[] = [];
  let bestCandidate: { variant: RepairVariant; note: number; confidence: number } | undefined;

  // Get original dimension note for comparison
  const originalEvaluation = await dimensionEvaluator({
    verses: candidate.verses,
  });
  const originalNote = originalEvaluation.note;

  for (const variant of variants.slice(0, request.maxAttempts)) {
    // 1. Check immutable slot preservation
    const changedImmutableSlots = findChangedImmutableSlots(
      variant.verses,
      candidate.verses,
      request.immutableSlots,
    );

    if (changedImmutableSlots.length > 0) {
      rejectedVariants.push(
        Object.freeze({
          variant,
          reason: "IMMUTABLE_SLOT_CHANGED" as const,
          changedSlots: Object.freeze(changedImmutableSlots),
        }),
      );
      attempts.push(
        Object.freeze({
          variant,
          improved: false,
          rejectionReason: "IMMUTABLE_SLOT_CHANGED" as const,
        }),
      );
      continue;
    }

    // 2. Hard validation
    const hardResult = await hardValidator(variant);

    if (!hardResult.ok) {
      rejectedVariants.push(
        Object.freeze({
          variant,
          reason: "HARD_VALIDATION_FAILED" as const,
          hardError: hardResult.error,
        }),
      );
      attempts.push(
        Object.freeze({
          variant,
          improved: false,
          rejectionReason: "HARD_VALIDATION_FAILED" as const,
        }),
      );
      continue;
    }

    // 3. Dimension evaluation
    const evaluation = await dimensionEvaluator(variant);
    const improved = evaluation.note > originalNote;

    attempts.push(
      Object.freeze({
        variant,
        improved,
        dimensionNote: evaluation.note,
      }),
    );

    if (improved) {
      if (bestCandidate === undefined || evaluation.note > bestCandidate.note) {
        bestCandidate = { variant, note: evaluation.note, confidence: evaluation.confidence };
      }
    }
  }

  // Return result
  if (bestCandidate !== undefined) {
    return Object.freeze({
      ok: true as const,
      value: Object.freeze({
        original: Object.freeze({
          id: candidate.id,
          verses: Object.freeze({ ...candidate.verses }),
        }),
        outcome: "VARIANT_ACCEPTED" as const,
        acceptedVariant: Object.freeze({
          branch: Object.freeze({
            id: `${candidate.id}:repair:${request.attempt}`,
            verses: Object.freeze({ ...bestCandidate.variant.verses }),
          }),
          verses: Object.freeze({ ...bestCandidate.variant.verses }),
          dimensionNote: bestCandidate.note,
          dimensionConfidence: bestCandidate.confidence,
        }),
        rejectedVariants: Object.freeze(rejectedVariants),
        attempts: Object.freeze(attempts),
      }),
    });
  }

  return Object.freeze({
    ok: true as const,
    value: Object.freeze({
      original: Object.freeze({
        id: candidate.id,
        verses: Object.freeze({ ...candidate.verses }),
      }),
      outcome: "ORIGINAL_PRESERVED" as const,
      rejectedVariants: Object.freeze(rejectedVariants),
      attempts: Object.freeze(attempts),
    }),
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findChangedImmutableSlots(
  variantVerses: Readonly<Record<VerseSlot, string>>,
  originalVerses: Readonly<Record<VerseSlot, string>>,
  immutableSlots: readonly VerseSlot[],
): readonly VerseSlot[] {
  const changed: VerseSlot[] = [];

  for (const slot of immutableSlots) {
    if (variantVerses[slot] !== originalVerses[slot]) {
      changed.push(slot);
    }
  }

  return Object.freeze(changed);
}

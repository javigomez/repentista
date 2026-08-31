import type {
  StructuredLlmGenerationError,
  StructuredLlmGenerationPort,
  StructuredLlmGenerationProvenance,
  StructuredLlmLimits,
  StructuredLlmOutputSchema,
  StructuredLlmPrompt,
  StructuredLlmUsage,
} from "../../ports/structured-llm-generation/index.js";

export type V2RhymeWordRole = "PREPARACION" | "REMATE";
export type V2RhymeWordStatus = "approved" | "pending";

export interface V2RhymeWordMorphology {
  readonly kind: string;
  readonly signature: string;
}

export interface V2RhymeWordCandidate {
  readonly id: string;
  readonly form: string;
  readonly lemma: string;
  readonly consonantFamily: string;
  readonly category: string;
  readonly status: V2RhymeWordStatus;
  readonly allowedRoles: readonly V2RhymeWordRole[];
  readonly morphology: V2RhymeWordMorphology;
  readonly semanticTags: readonly string[];
}

export interface V2RhymeWordMorphologyPolicy {
  readonly rejectSameLemma: boolean;
  readonly rejectRepeatingKinds: readonly string[];
}

export interface V2RhymeWordFilteringRequest {
  readonly v4FinalWord: V2RhymeWordCandidate;
  readonly candidates: readonly V2RhymeWordCandidate[];
  readonly requiredRole: V2RhymeWordRole;
  readonly allowedCategories: readonly string[];
  readonly morphologyPolicy: V2RhymeWordMorphologyPolicy;
}

export type V2RhymeWordExclusionCode =
  | "WORD_NOT_APPROVED"
  | "CONSONANT_FAMILY_MISMATCH"
  | "PREPARATION_ROLE_NOT_ALLOWED"
  | "CATEGORY_NOT_ALLOWED"
  | "LEMMA_REPETITION_FORBIDDEN"
  | "MORPHOLOGICAL_REPETITION_FORBIDDEN";

export interface V2RhymeWordExclusionReason {
  readonly code: V2RhymeWordExclusionCode;
  readonly message: string;
}

export interface V2RhymeWordExclusion {
  readonly candidate: V2RhymeWordCandidate;
  readonly reasons: readonly V2RhymeWordExclusionReason[];
}

export interface V2RhymeWordFilteringResult {
  readonly viableCandidates: readonly V2RhymeWordCandidate[];
  readonly exclusions: readonly V2RhymeWordExclusion[];
}

export interface V2RhymeWordSemanticOrdering {
  readonly generator: StructuredLlmGenerationPort;
  readonly prompt: StructuredLlmPrompt;
  readonly limits: StructuredLlmLimits;
}

export interface V2RhymeWordSelectionRequest extends V2RhymeWordFilteringRequest {
  readonly semanticOrdering: V2RhymeWordSemanticOrdering;
}

export interface V2RhymeWordSelection {
  readonly selected: V2RhymeWordCandidate;
  readonly consonantFamily: string;
  readonly category: string;
  readonly reason: string;
  readonly alternatives: readonly V2RhymeWordCandidate[];
  readonly exclusions: readonly V2RhymeWordExclusion[];
  readonly provenance: StructuredLlmGenerationProvenance;
  readonly usage: StructuredLlmUsage;
}

export type V2RhymeWordSelectionFailureCode =
  | "NO_VIABLE_V2_RHYME_WORD"
  | "LLM_SELECTED_OUT_OF_LIST_CANDIDATE"
  | "LLM_ORDERING_FAILED";

export type V2RhymeWordSelectionFailure =
  | {
      readonly code: "NO_VIABLE_V2_RHYME_WORD";
      readonly message: string;
      readonly v4FinalWordId: string;
      readonly exclusions: readonly V2RhymeWordExclusion[];
    }
  | {
      readonly code: "LLM_SELECTED_OUT_OF_LIST_CANDIDATE";
      readonly message: string;
      readonly selectedCandidateId: string;
      readonly allowedCandidateIds: readonly string[];
      readonly exclusions: readonly V2RhymeWordExclusion[];
      readonly provenance?: StructuredLlmGenerationProvenance;
    }
  | {
      readonly code: "LLM_ORDERING_FAILED";
      readonly message: string;
      readonly cause: StructuredLlmGenerationError;
      readonly exclusions: readonly V2RhymeWordExclusion[];
    };

export type V2RhymeWordSelectionResult =
  | { readonly ok: true; readonly value: V2RhymeWordSelection }
  | { readonly ok: false; readonly error: V2RhymeWordSelectionFailure };

interface V2RhymeWordOrderingOutput {
  readonly selectedCandidateId: string;
  readonly orderedCandidateIds: readonly string[];
  readonly reason: string;
}

interface V2RhymeWordOrderingCandidateInput {
  readonly id: string;
  readonly form: string;
  readonly lemma: string;
  readonly category: string;
  readonly morphology: V2RhymeWordMorphology;
  readonly semanticTags: readonly string[];
}

interface V2RhymeWordOrderingInput {
  readonly v4FinalWord: V2RhymeWordOrderingCandidateInput;
  readonly consonantFamily: string;
  readonly requiredRole: V2RhymeWordRole;
  readonly candidates: readonly V2RhymeWordOrderingCandidateInput[];
}

const v2RhymeWordOrderingSchema: StructuredLlmOutputSchema<V2RhymeWordOrderingOutput> =
  Object.freeze({
    name: "v2-rhyme-word-ordering",
    version: "0.1.0",
    validate(value: unknown) {
      if (!isRecord(value)) {
        return {
          ok: false as const,
          issues: [{ path: "$", message: "Expected an object." }],
        };
      }

      const issues: { readonly path: string; readonly message: string }[] = [];
      const allowedFields = new Set([
        "selectedCandidateId",
        "orderedCandidateIds",
        "reason",
      ]);

      for (const field of Object.keys(value)) {
        if (!allowedFields.has(field)) {
          issues.push({
            path: `$.${field}`,
            message: "Unexpected field; expected only stable candidate IDs and reason.",
          });
        }
      }

      const selectedCandidateId =
        typeof value.selectedCandidateId === "string"
          ? value.selectedCandidateId.trim()
          : undefined;

      if (selectedCandidateId === undefined || selectedCandidateId.length === 0) {
        issues.push({
          path: "$.selectedCandidateId",
          message: "Expected a non-empty candidate ID string.",
        });
      }

      const orderedCandidateIds: string[] = [];

      if (!Array.isArray(value.orderedCandidateIds)) {
        issues.push({
          path: "$.orderedCandidateIds",
          message: "Expected an array of candidate ID strings.",
        });
      } else {
        const seenOrderedCandidateIds = new Set<string>();

        value.orderedCandidateIds.forEach((candidateId, index) => {
          const normalizedCandidateId =
            typeof candidateId === "string" ? candidateId.trim() : undefined;

          if (normalizedCandidateId === undefined || normalizedCandidateId.length === 0) {
            issues.push({
              path: `$.orderedCandidateIds[${index}]`,
              message: "Expected a non-empty candidate ID string.",
            });
            return;
          }

          if (seenOrderedCandidateIds.has(normalizedCandidateId)) {
            issues.push({
              path: `$.orderedCandidateIds[${index}]`,
              message: "Candidate ID must not be repeated.",
            });
            return;
          }

          orderedCandidateIds.push(normalizedCandidateId);
          seenOrderedCandidateIds.add(normalizedCandidateId);
        });
      }

      const reason = typeof value.reason === "string" ? value.reason.trim() : undefined;

      if (reason === undefined || reason.length === 0) {
        issues.push({
          path: "$.reason",
          message: "Expected a non-empty semantic ordering reason.",
        });
      }

      if (issues.length > 0 || selectedCandidateId === undefined || reason === undefined) {
        return {
          ok: false as const,
          issues: Object.freeze([...issues]),
        };
      }

      return {
        ok: true as const,
        value: Object.freeze({
          selectedCandidateId,
          orderedCandidateIds: Object.freeze([...orderedCandidateIds]),
          reason,
        }),
      };
    },
  });

const exclusionReason = (
  code: V2RhymeWordExclusionCode,
  message: string,
): V2RhymeWordExclusionReason => Object.freeze({ code, message });

const freezeExclusion = (
  candidate: V2RhymeWordCandidate,
  reasons: readonly V2RhymeWordExclusionReason[],
): V2RhymeWordExclusion =>
  Object.freeze({
    candidate,
    reasons: Object.freeze([...reasons]),
  });

const hasRole = (
  candidate: V2RhymeWordCandidate,
  requiredRole: V2RhymeWordRole,
): boolean => candidate.allowedRoles.includes(requiredRole);

const isMorphologicalRepetitionForbidden = (
  request: V2RhymeWordFilteringRequest,
  candidate: V2RhymeWordCandidate,
): boolean =>
  candidate.morphology.kind === request.v4FinalWord.morphology.kind &&
  request.morphologyPolicy.rejectRepeatingKinds.includes(candidate.morphology.kind);

const collectExclusionReasons = (
  request: V2RhymeWordFilteringRequest,
  candidate: V2RhymeWordCandidate,
): readonly V2RhymeWordExclusionReason[] => {
  const reasons: V2RhymeWordExclusionReason[] = [];

  if (candidate.status !== "approved") {
    reasons.push(
      exclusionReason("WORD_NOT_APPROVED", "La palabra candidata no esta aprobada."),
    );
  }

  if (candidate.consonantFamily !== request.v4FinalWord.consonantFamily) {
    reasons.push(
      exclusionReason(
        "CONSONANT_FAMILY_MISMATCH",
        "La palabra candidata no comparte la familia consonante de V4.",
      ),
    );
  }

  if (!hasRole(candidate, request.requiredRole)) {
    reasons.push(
      exclusionReason(
        "PREPARATION_ROLE_NOT_ALLOWED",
        "La palabra candidata no permite el rol requerido para V2.",
      ),
    );
  }

  if (!request.allowedCategories.includes(candidate.category)) {
    reasons.push(
      exclusionReason(
        "CATEGORY_NOT_ALLOWED",
        "La categoria gramatical de la palabra candidata no esta permitida.",
      ),
    );
  }

  if (request.morphologyPolicy.rejectSameLemma && candidate.lemma === request.v4FinalWord.lemma) {
    reasons.push(
      exclusionReason(
        "LEMMA_REPETITION_FORBIDDEN",
        "La palabra candidata repite el lema de la palabra final de V4.",
      ),
    );
  }

  if (isMorphologicalRepetitionForbidden(request, candidate)) {
    reasons.push(
      exclusionReason(
        "MORPHOLOGICAL_REPETITION_FORBIDDEN",
        "La palabra candidata repite una morfologia prohibida para la pareja V2-V4.",
      ),
    );
  }

  return Object.freeze(reasons);
};

export function filterV2RhymeWordCandidates(
  request: V2RhymeWordFilteringRequest,
): V2RhymeWordFilteringResult {
  const viableCandidates: V2RhymeWordCandidate[] = [];
  const exclusions: V2RhymeWordExclusion[] = [];

  for (const candidate of request.candidates) {
    const reasons = collectExclusionReasons(request, candidate);

    if (reasons.length === 0) {
      viableCandidates.push(candidate);
      continue;
    }

    exclusions.push(freezeExclusion(candidate, reasons));
  }

  return Object.freeze({
    viableCandidates: Object.freeze([...viableCandidates]),
    exclusions: Object.freeze([...exclusions]),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toOrderingCandidateInput(
  candidate: V2RhymeWordCandidate,
): V2RhymeWordOrderingCandidateInput {
  return Object.freeze({
    id: candidate.id,
    form: candidate.form,
    lemma: candidate.lemma,
    category: candidate.category,
    morphology: candidate.morphology,
    semanticTags: Object.freeze([...candidate.semanticTags]),
  });
}

function createSemanticOrderingInput(
  request: V2RhymeWordSelectionRequest,
  viableCandidates: readonly V2RhymeWordCandidate[],
): V2RhymeWordOrderingInput {
  return Object.freeze({
    v4FinalWord: toOrderingCandidateInput(request.v4FinalWord),
    consonantFamily: request.v4FinalWord.consonantFamily,
    requiredRole: request.requiredRole,
    candidates: Object.freeze(viableCandidates.map(toOrderingCandidateInput)),
  });
}

function findOutOfListCandidateId(
  ordering: V2RhymeWordOrderingOutput,
  allowedCandidateIds: ReadonlySet<string>,
): string | undefined {
  const returnedCandidateIds = [
    ordering.selectedCandidateId,
    ...ordering.orderedCandidateIds,
  ];

  return returnedCandidateIds.find((candidateId) => !allowedCandidateIds.has(candidateId));
}

function orderViableCandidates(
  viableCandidates: readonly V2RhymeWordCandidate[],
  ordering: V2RhymeWordOrderingOutput,
): readonly V2RhymeWordCandidate[] {
  const candidatesById = new Map(
    viableCandidates.map((candidate) => [candidate.id, candidate] as const),
  );
  const orderedCandidates: V2RhymeWordCandidate[] = [];
  const usedCandidateIds = new Set<string>();

  for (const candidateId of [
    ordering.selectedCandidateId,
    ...ordering.orderedCandidateIds,
  ]) {
    const candidate = candidatesById.get(candidateId);

    if (candidate === undefined || usedCandidateIds.has(candidate.id)) {
      continue;
    }

    orderedCandidates.push(candidate);
    usedCandidateIds.add(candidate.id);
  }

  for (const candidate of viableCandidates) {
    if (usedCandidateIds.has(candidate.id)) {
      continue;
    }

    orderedCandidates.push(candidate);
    usedCandidateIds.add(candidate.id);
  }

  return Object.freeze([...orderedCandidates]);
}

export async function selectV2RhymeWord(
  request: V2RhymeWordSelectionRequest,
): Promise<V2RhymeWordSelectionResult> {
  const filtering = filterV2RhymeWordCandidates(request);

  if (filtering.viableCandidates.length === 0) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "NO_VIABLE_V2_RHYME_WORD" as const,
        message: "No approved V2 rhyme word survived hard catalog filtering.",
        v4FinalWordId: request.v4FinalWord.id,
        exclusions: filtering.exclusions,
      }),
    });
  }

  const orderingResult = await request.semanticOrdering.generator.generate({
    operation: "select-v2-rhyme-word",
    prompt: request.semanticOrdering.prompt,
    input: createSemanticOrderingInput(request, filtering.viableCandidates),
    outputSchema: v2RhymeWordOrderingSchema,
    limits: request.semanticOrdering.limits,
  });

  if (!orderingResult.ok) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "LLM_ORDERING_FAILED" as const,
        message: "The structured LLM could not order approved V2 rhyme word candidates.",
        cause: orderingResult.error,
        exclusions: filtering.exclusions,
      }),
    });
  }

  const allowedCandidatesById = new Map(
    filtering.viableCandidates.map((candidate) => [candidate.id, candidate] as const),
  );
  const allowedCandidateIds = new Set(allowedCandidatesById.keys());
  const outOfListCandidateId = findOutOfListCandidateId(
    orderingResult.value.data,
    allowedCandidateIds,
  );

  if (outOfListCandidateId !== undefined) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "LLM_SELECTED_OUT_OF_LIST_CANDIDATE" as const,
        message: "The structured LLM selected or ordered a candidate outside the closed V2 list.",
        selectedCandidateId: outOfListCandidateId,
        allowedCandidateIds: Object.freeze([...allowedCandidateIds]),
        exclusions: filtering.exclusions,
        provenance: orderingResult.value.provenance,
      }),
    });
  }

  const selected = allowedCandidatesById.get(orderingResult.value.data.selectedCandidateId);

  if (selected === undefined) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "LLM_SELECTED_OUT_OF_LIST_CANDIDATE" as const,
        message: "The structured LLM selected a candidate outside the closed V2 list.",
        selectedCandidateId: orderingResult.value.data.selectedCandidateId,
        allowedCandidateIds: Object.freeze([...allowedCandidateIds]),
        exclusions: filtering.exclusions,
        provenance: orderingResult.value.provenance,
      }),
    });
  }

  const orderedCandidates = orderViableCandidates(
    filtering.viableCandidates,
    orderingResult.value.data,
  );
  const alternatives = orderedCandidates.filter((candidate) => candidate.id !== selected.id);

  return Object.freeze({
    ok: true as const,
    value: Object.freeze({
      selected,
      consonantFamily: selected.consonantFamily,
      category: selected.category,
      reason: orderingResult.value.data.reason,
      alternatives: Object.freeze([...alternatives]),
      exclusions: filtering.exclusions,
      provenance: orderingResult.value.provenance,
      usage: orderingResult.value.usage,
    }),
  });
}

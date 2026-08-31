import type {
  StructuredLlmGenerationError,
  StructuredLlmGenerationPort,
  StructuredLlmGenerationProvenance,
  StructuredLlmLimits,
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
  | "LLM_ORDERING_FAILED"
  | "V2_RHYME_WORD_SELECTION_NOT_IMPLEMENTED";

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
    }
  | {
      readonly code: "V2_RHYME_WORD_SELECTION_NOT_IMPLEMENTED";
      readonly message: string;
    };

export type V2RhymeWordSelectionResult =
  | { readonly ok: true; readonly value: V2RhymeWordSelection }
  | { readonly ok: false; readonly error: V2RhymeWordSelectionFailure };

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

  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "V2_RHYME_WORD_SELECTION_NOT_IMPLEMENTED" as const,
      message: "V2 rhyme word selection is not implemented yet.",
    }),
  });
}

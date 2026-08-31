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

export function filterV2RhymeWordCandidates(
  _request: V2RhymeWordFilteringRequest,
): V2RhymeWordFilteringResult {
  return Object.freeze({
    viableCandidates: Object.freeze([]),
    exclusions: Object.freeze([]),
  });
}

export async function selectV2RhymeWord(
  _request: V2RhymeWordSelectionRequest,
): Promise<V2RhymeWordSelectionResult> {
  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "V2_RHYME_WORD_SELECTION_NOT_IMPLEMENTED" as const,
      message: "V2 rhyme word selection is not implemented yet.",
    }),
  });
}

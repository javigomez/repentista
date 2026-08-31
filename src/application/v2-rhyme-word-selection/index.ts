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

export function filterV2RhymeWordCandidates(
  _request: V2RhymeWordFilteringRequest,
): V2RhymeWordFilteringResult {
  return Object.freeze({
    viableCandidates: Object.freeze([]),
    exclusions: Object.freeze([]),
  });
}

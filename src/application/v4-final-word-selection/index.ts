import type { StructuredLlmGenerationPort } from "../../ports/structured-llm-generation/index.js";

export interface V4FinalWordSemanticPlan {
  readonly finalIntent: string;
  readonly requiredSemanticTags: readonly string[];
  readonly preferredCategories: readonly string[];
}

export type V4FinalWordTonicity = "aguda" | "llana" | "esdrujula";
export type V4FinalWordEditorialStatus = "approved" | "pending";

export interface V4FinalWordCandidateInput {
  readonly id: string;
  readonly word: string;
  readonly lemma: string;
  readonly dictionaryVersion: string;
  readonly status: V4FinalWordEditorialStatus;
  readonly tonicity: V4FinalWordTonicity;
  readonly category: string;
  readonly allowedAsPunchline: boolean;
  readonly rhymeFamilyId: string;
  readonly rhymePartnerCount: number;
  readonly semanticTags: readonly string[];
}

export interface V4FinalWordSelectionRequest {
  readonly dictionaryVersion: string;
  readonly plan: V4FinalWordSemanticPlan;
  readonly candidates: readonly V4FinalWordCandidateInput[];
}

export interface V4FinalWordSelectionDependencies {
  readonly prioritizer: StructuredLlmGenerationPort;
}

export interface V4FinalWordCandidateOption {
  readonly id: string;
  readonly word: string;
  readonly lemma: string;
  readonly dictionaryVersion: string;
  readonly tonicity: "aguda" | "llana";
  readonly category: string;
  readonly rhymeFamilyId: string;
}

export interface V4FinalWordSelectionReason {
  readonly candidateId: string;
  readonly reason: string;
}

export interface V4FinalWordSelection {
  readonly selected: V4FinalWordCandidateOption;
  readonly alternatives: readonly V4FinalWordCandidateOption[];
  readonly reasons: readonly V4FinalWordSelectionReason[];
  readonly dictionaryVersion: string;
}

export interface V4FinalWordSelectionFailure {
  readonly code: "NO_VIABLE_FINAL_WORD" | "SELECTED_CANDIDATE_NOT_OFFERED";
  readonly message: string;
  readonly dictionaryVersion: string;
  readonly candidates: readonly V4FinalWordCandidateOption[];
}

export type V4FinalWordSelectionResult =
  | { readonly ok: true; readonly value: V4FinalWordSelection }
  | { readonly ok: false; readonly error: V4FinalWordSelectionFailure };

export async function selectV4FinalWord(
  request: V4FinalWordSelectionRequest,
  dependencies: V4FinalWordSelectionDependencies,
): Promise<V4FinalWordSelectionResult> {
  void dependencies;

  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "NO_VIABLE_FINAL_WORD" as const,
      message: "V4 final word selection is not implemented yet.",
      dictionaryVersion: request.dictionaryVersion,
      candidates: Object.freeze([]),
    }),
  });
}

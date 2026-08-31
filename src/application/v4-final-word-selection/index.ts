import type { StructuredLlmGenerationPort } from "../../ports/structured-llm-generation/index.js";

const APPLIED_FILTERS = Object.freeze([
  "APPROVED_STATUS",
  "PUNCHLINE_PERMISSION",
  "SUPPORTED_TONICITY",
  "VIABLE_RHYME_FAMILY",
  "REQUIRED_SEMANTIC_TAGS",
  "PREFERRED_CATEGORY",
] as const);

type V4FinalWordAppliedFilter = (typeof APPLIED_FILTERS)[number];

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
  readonly code:
    | "NO_VIABLE_FINAL_WORD"
    | "SELECTED_CANDIDATE_NOT_OFFERED"
    | "PRIORITIZATION_FAILED";
  readonly message: string;
  readonly dictionaryVersion: string;
  readonly candidates: readonly V4FinalWordCandidateOption[];
  readonly appliedFilters?: readonly V4FinalWordAppliedFilter[];
  readonly exclusions?: readonly V4FinalWordCandidateExclusion[];
}

export interface V4FinalWordCandidateExclusion {
  readonly candidateId: string;
  readonly code:
    | "NOT_APPROVED"
    | "PUNCHLINE_NOT_ALLOWED"
    | "UNSUPPORTED_TONICITY"
    | "NO_VIABLE_RHYME_FAMILY"
    | "MISSING_REQUIRED_SEMANTIC_TAGS"
    | "CATEGORY_NOT_PREFERRED";
  readonly reason: string;
}

interface PrioritizedFinalWord {
  readonly selectedCandidateId: string;
  readonly ranking: readonly V4FinalWordSelectionReason[];
}

export type V4FinalWordSelectionResult =
  | { readonly ok: true; readonly value: V4FinalWordSelection }
  | { readonly ok: false; readonly error: V4FinalWordSelectionFailure };

export async function selectV4FinalWord(
  request: V4FinalWordSelectionRequest,
  dependencies: V4FinalWordSelectionDependencies,
): Promise<V4FinalWordSelectionResult> {
  const filtered = filterCandidates(request);

  if (filtered.candidates.length === 0) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "NO_VIABLE_FINAL_WORD" as const,
        message: "No hay palabras aprobadas viables para cerrar V4.",
        dictionaryVersion: request.dictionaryVersion,
        candidates: Object.freeze([]),
        appliedFilters: APPLIED_FILTERS,
        exclusions: filtered.exclusions,
      }),
    });
  }

  const prioritization = await dependencies.prioritizer.generate<PrioritizedFinalWord>({
    operation: "select-v4-final-word",
    prompt: {
      id: "generation.v4-final-word-selection",
      version: "0.1.0",
      messages: [
        {
          role: "system",
          content:
            "Prioriza exclusivamente IDs de candidatas autorizadas para la palabra final de V4.",
        },
        {
          role: "user",
          content: "Elige el ID de la mejor candidata y conserva un ranking breve con razones.",
        },
      ],
    },
    input: Object.freeze({
      dictionaryVersion: request.dictionaryVersion,
      plan: request.plan,
      candidates: filtered.candidates,
    }),
    outputSchema: prioritizedFinalWordSchema,
    limits: {
      timeoutMs: 1_000,
      maxOutputTokens: 500,
    },
  });

  if (!prioritization.ok) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "PRIORITIZATION_FAILED" as const,
        message: prioritization.error.message,
        dictionaryVersion: request.dictionaryVersion,
        candidates: filtered.candidates,
        appliedFilters: APPLIED_FILTERS,
        exclusions: filtered.exclusions,
      }),
    });
  }

  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "PRIORITIZATION_FAILED" as const,
      message: "V4 final word prioritization acceptance is not implemented yet.",
      dictionaryVersion: request.dictionaryVersion,
      candidates: filtered.candidates,
      appliedFilters: APPLIED_FILTERS,
      exclusions: filtered.exclusions,
    }),
  });
}

interface FilteredV4FinalWordCandidates {
  readonly candidates: readonly V4FinalWordCandidateOption[];
  readonly exclusions: readonly V4FinalWordCandidateExclusion[];
}

const prioritizedFinalWordSchema = Object.freeze({
  name: "v4-final-word-prioritization",
  version: "0.1.0",
  validate(value: unknown) {
    if (!isRecord(value)) {
      return {
        ok: false as const,
        issues: [{ path: "$", message: "Expected an object." }],
      };
    }

    if (typeof value.selectedCandidateId !== "string" || value.selectedCandidateId.trim().length === 0) {
      return {
        ok: false as const,
        issues: [{ path: "$.selectedCandidateId", message: "Expected a non-empty candidate ID." }],
      };
    }

    if (!Array.isArray(value.ranking)) {
      return {
        ok: false as const,
        issues: [{ path: "$.ranking", message: "Expected a ranking array." }],
      };
    }

    for (const [index, item] of value.ranking.entries()) {
      if (!isRecord(item)) {
        return {
          ok: false as const,
          issues: [{ path: `$.ranking[${index}]`, message: "Expected a ranking item object." }],
        };
      }

      if (typeof item.candidateId !== "string" || item.candidateId.trim().length === 0) {
        return {
          ok: false as const,
          issues: [
            { path: `$.ranking[${index}].candidateId`, message: "Expected a non-empty candidate ID." },
          ],
        };
      }

      if (typeof item.reason !== "string" || item.reason.trim().length === 0) {
        return {
          ok: false as const,
          issues: [{ path: `$.ranking[${index}].reason`, message: "Expected a non-empty reason." }],
        };
      }
    }

    return { ok: true as const, value: value as unknown as PrioritizedFinalWord };
  },
});

const filterCandidates = (
  request: V4FinalWordSelectionRequest,
): FilteredV4FinalWordCandidates => {
  const candidates: V4FinalWordCandidateOption[] = [];
  const exclusions: V4FinalWordCandidateExclusion[] = [];

  for (const candidate of request.candidates) {
    const exclusion = findExclusion(candidate, request.plan);

    if (exclusion !== undefined) {
      exclusions.push(exclusion);
      continue;
    }

    candidates.push(toCandidateOption(candidate));
  }

  return Object.freeze({
    candidates: freezeArray(candidates),
    exclusions: freezeArray(exclusions),
  });
};

const findExclusion = (
  candidate: V4FinalWordCandidateInput,
  plan: V4FinalWordSemanticPlan,
): V4FinalWordCandidateExclusion | undefined => {
  if (candidate.status !== "approved") {
    return exclusion(
      candidate.id,
      "NOT_APPROVED",
      "La palabra no tiene estado editorial approved.",
    );
  }

  if (!candidate.allowedAsPunchline) {
    return exclusion(
      candidate.id,
      "PUNCHLINE_NOT_ALLOWED",
      "La palabra no esta permitida como remate.",
    );
  }

  if (!isSupportedTonicity(candidate.tonicity)) {
    return exclusion(
      candidate.id,
      "UNSUPPORTED_TONICITY",
      "La palabra usa una tonicidad no soportada para esta version.",
    );
  }

  if (candidate.rhymeFamilyId.trim().length === 0 || candidate.rhymePartnerCount < 1) {
    return exclusion(
      candidate.id,
      "NO_VIABLE_RHYME_FAMILY",
      "La palabra no tiene familia de rima con pareja aprobada viable.",
    );
  }

  const semanticTags = new Set(candidate.semanticTags);
  const missingTags = plan.requiredSemanticTags.filter((tag) => !semanticTags.has(tag));

  if (missingTags.length > 0) {
    return exclusion(
      candidate.id,
      "MISSING_REQUIRED_SEMANTIC_TAGS",
      `La palabra no cubre etiquetas semanticas requeridas: ${missingTags.join(", ")}.`,
    );
  }

  if (plan.preferredCategories.length > 0 && !plan.preferredCategories.includes(candidate.category)) {
    return exclusion(
      candidate.id,
      "CATEGORY_NOT_PREFERRED",
      "La categoria gramatical no esta entre las preferidas para el plan.",
    );
  }

  return undefined;
};

const toCandidateOption = (
  candidate: V4FinalWordCandidateInput,
): V4FinalWordCandidateOption =>
  Object.freeze({
    id: candidate.id,
    word: candidate.word,
    lemma: candidate.lemma,
    dictionaryVersion: candidate.dictionaryVersion,
    tonicity: candidate.tonicity as V4FinalWordCandidateOption["tonicity"],
    category: candidate.category,
    rhymeFamilyId: candidate.rhymeFamilyId,
  });

const isSupportedTonicity = (
  tonicity: V4FinalWordTonicity,
): tonicity is V4FinalWordCandidateOption["tonicity"] =>
  tonicity === "aguda" || tonicity === "llana";

const exclusion = (
  candidateId: string,
  code: V4FinalWordCandidateExclusion["code"],
  reason: string,
): V4FinalWordCandidateExclusion => Object.freeze({ candidateId, code, reason });

const freezeArray = <T>(values: readonly T[]): readonly T[] => Object.freeze([...values]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

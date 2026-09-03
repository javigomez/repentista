export type AnswerAmbiguityRole = "PREPARACION" | "REMATE";
export type AnswerAmbiguityStatus = "VALIDO" | "INVALIDO" | "DUDOSO";

export interface AnswerAmbiguityWord {
  readonly id: string;
  readonly form: string;
  readonly dictionaryVersion: string;
  readonly rhymeFamilyId: string;
  readonly role: AnswerAmbiguityRole;
  readonly category: string;
}

export interface AnswerAmbiguityRequest {
  readonly dictionaryVersion: string;
  readonly targetWordId: string;
  readonly rhymeFamilyId: string;
  readonly role: AnswerAmbiguityRole;
  readonly allowedCategories: readonly string[];
  readonly catalog: readonly AnswerAmbiguityWord[];
  readonly semanticDecisions?: Readonly<Record<string, "EXCLUDED" | "UNRESOLVED">>;
}

export type AnswerAmbiguityExclusionCode =
  | "DICTIONARY_VERSION_MISMATCH"
  | "RHYME_FAMILY_MISMATCH"
  | "ROLE_NOT_ALLOWED"
  | "CATEGORY_NOT_ALLOWED"
  | "SEMANTICALLY_EXCLUDED";

export interface AnswerAmbiguityExclusion {
  readonly candidateId: string;
  readonly code: AnswerAmbiguityExclusionCode;
}

export interface AnswerAmbiguityResult {
  readonly status: AnswerAmbiguityStatus;
  readonly dictionaryVersion: string;
  readonly correctAnswers: readonly string[];
  readonly alternatives: readonly string[];
  readonly exclusions: readonly AnswerAmbiguityExclusion[];
}

export function detectAnswerAmbiguity(request: AnswerAmbiguityRequest): AnswerAmbiguityResult {
  const accepted: AnswerAmbiguityWord[] = [];
  const exclusions: AnswerAmbiguityExclusion[] = [];
  let unresolved = false;

  for (const candidate of request.catalog) {
    const decision = request.semanticDecisions?.[candidate.id];
    const exclusion = exclusionFor(candidate, request);

    if (exclusion !== undefined) {
      exclusions.push(exclusion);
    } else if (decision === "EXCLUDED") {
      exclusions.push({ candidateId: candidate.id, code: "SEMANTICALLY_EXCLUDED" });
    } else if (decision === "UNRESOLVED") {
      accepted.push(candidate);
      unresolved = true;
    } else {
      accepted.push(candidate);
    }
  }

  const target = accepted.find((candidate) => candidate.id === request.targetWordId);
  const correctAnswers = accepted.map((candidate) => candidate.form);
  const alternatives = accepted
    .filter((candidate) => candidate.id !== request.targetWordId)
    .map((candidate) => candidate.form);
  const status: AnswerAmbiguityStatus =
    target === undefined || alternatives.length > 0
      ? unresolved && target !== undefined
        ? "DUDOSO"
        : "INVALIDO"
      : "VALIDO";

  return Object.freeze({
    status,
    dictionaryVersion: request.dictionaryVersion,
    correctAnswers: Object.freeze(correctAnswers),
    alternatives: Object.freeze(alternatives),
    exclusions: Object.freeze(exclusions.map((item) => Object.freeze(item))),
  });
}

const exclusionFor = (
  candidate: AnswerAmbiguityWord,
  request: AnswerAmbiguityRequest,
): AnswerAmbiguityExclusion | undefined => {
  if (candidate.dictionaryVersion !== request.dictionaryVersion) {
    return { candidateId: candidate.id, code: "DICTIONARY_VERSION_MISMATCH" };
  }
  if (candidate.rhymeFamilyId !== request.rhymeFamilyId) {
    return { candidateId: candidate.id, code: "RHYME_FAMILY_MISMATCH" };
  }
  if (candidate.role !== request.role) {
    return { candidateId: candidate.id, code: "ROLE_NOT_ALLOWED" };
  }
  if (!request.allowedCategories.includes(candidate.category)) {
    return { candidateId: candidate.id, code: "CATEGORY_NOT_ALLOWED" };
  }
  return undefined;
};

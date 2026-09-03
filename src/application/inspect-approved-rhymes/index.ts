import type {
  ApprovedWord,
  ApprovedWordDictionary,
} from "../../content/approved-word-dictionary/index.js";
import type {
  WordAnalysisPort,
  WordAnalysisResult,
} from "../../ports/index.js";

export interface InspectApprovedRhymesRequest {
  readonly word: string;
  readonly dictionaryVersion: string;
  readonly category?: string;
  readonly role?: string;
}

export type InspectApprovedRhymesErrorCode =
  "UNKNOWN_WORD" | "DICTIONARY_VERSION_UNAVAILABLE" | "DOUBTFUL_ANALYSIS";

export type InspectApprovedRhymesError =
  | {
      readonly code: "UNKNOWN_WORD";
      readonly message: string;
      readonly word: string;
    }
  | {
      readonly code: "DICTIONARY_VERSION_UNAVAILABLE";
      readonly message: string;
      readonly version: string;
      readonly availableVersions: readonly string[];
    }
  | {
      readonly code: "DOUBTFUL_ANALYSIS";
      readonly message: string;
      readonly word: string;
      readonly analysisError: string;
    };

export interface InspectWordInfo {
  readonly form: string;
  readonly analysis: {
    readonly stressKind: string;
    readonly syllables: readonly string[];
  };
}

export interface InspectRhymeFamily {
  readonly key: string;
}

export interface InspectCandidateRoles {
  readonly preparation: boolean;
  readonly punchline: boolean;
}

export interface InspectCandidate {
  readonly form: string;
  readonly category: string;
  readonly roles: InspectCandidateRoles;
}

export interface InspectExclusionReason {
  readonly code: string;
  readonly message: string;
}

export interface InspectExclusion {
  readonly form: string;
  readonly reason: InspectExclusionReason;
}

export interface InspectApprovedRhymesValue {
  readonly word: InspectWordInfo;
  readonly family: InspectRhymeFamily;
  readonly candidates: readonly InspectCandidate[];
  readonly exclusions: readonly InspectExclusion[];
}

export type InspectApprovedRhymesResult =
  | { readonly ok: true; readonly value: InspectApprovedRhymesValue }
  | { readonly ok: false; readonly error: InspectApprovedRhymesError };

export interface InspectApprovedRhymesDependencies {
  readonly dictionary: ApprovedWordDictionary;
  readonly analyzer: WordAnalysisPort;
}

export interface InspectApprovedRhymesService {
  inspect(request: InspectApprovedRhymesRequest): InspectApprovedRhymesResult;
}

const VOWELS = /[aeiouáéíóú]/iu;

function isVowel(char: string): boolean {
  return VOWELS.test(char);
}

function stripAccents(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "");
}

function extractRhymeKey(
  word: string,
  analysis: Extract<WordAnalysisResult, { ok: true }>,
): string {
  const form = word.toLocaleLowerCase("es");
  const vowelPositions: number[] = [];

  for (let i = 0; i < form.length; i++) {
    if (isVowel(form[i]!)) {
      vowelPositions.push(i);
    }
  }

  if (vowelPositions.length === 0) {
    return stripAccents(form);
  }

  const syllables = analysis.syllables;
  const stressedIndex = analysis.stressedSyllableIndex;
  const stressedSyllable = syllables[stressedIndex] ?? "";

  let lastStressedVowelPos = -1;
  const stressedStart = form.indexOf(stressedSyllable.toLocaleLowerCase("es"));

  if (stressedStart >= 0) {
    const stressedEnd = stressedStart + stressedSyllable.length;

    for (let i = stressedStart; i < stressedEnd && i < form.length; i++) {
      if (isVowel(form[i]!)) {
        lastStressedVowelPos = i;
      }
    }
  }

  if (lastStressedVowelPos < 0) {
    lastStressedVowelPos = vowelPositions[vowelPositions.length - 1]!;
  }

  return stripAccents(form.slice(lastStressedVowelPos));
}

function matchesCategory(
  word: ApprovedWord,
  category: string | undefined,
): boolean {
  if (category === undefined) return true;
  return word.category === category;
}

function matchesRole(word: ApprovedWord, role: string | undefined): boolean {
  if (role === undefined) return true;
  const normalizedRole = role.toUpperCase();
  if (normalizedRole === "PREPARATION") return word.allowedAsPreparation;
  if (normalizedRole === "PUNCHLINE") return word.allowedAsPunchline;
  return true;
}

function toCandidate(word: ApprovedWord): InspectCandidate {
  return Object.freeze({
    form: word.form,
    category: word.category,
    roles: Object.freeze({
      preparation: word.allowedAsPreparation,
      punchline: word.allowedAsPunchline,
    }),
  });
}

function exclusionReason(
  code: string,
  message: string,
): InspectExclusionReason {
  return Object.freeze({ code, message });
}

function buildExclusion(
  word: ApprovedWord,
  category: string | undefined,
  role: string | undefined,
): InspectExclusion | undefined {
  const reasons: InspectExclusionReason[] = [];

  if (category !== undefined && word.category !== category) {
    reasons.push(
      exclusionReason(
        "CATEGORY_MISMATCH",
        `La categoría "${word.category}" no coincide con el filtro "${category}".`,
      ),
    );
  }

  if (role !== undefined) {
    const normalizedRole = role.toUpperCase();
    if (normalizedRole === "PREPARATION" && !word.allowedAsPreparation) {
      reasons.push(
        exclusionReason(
          "ROLE_NOT_ALLOWED",
          `La palabra no permite el rol PREPARATION.`,
        ),
      );
    }
    if (normalizedRole === "PUNCHLINE" && !word.allowedAsPunchline) {
      reasons.push(
        exclusionReason(
          "ROLE_NOT_ALLOWED",
          `La palabra no permite el rol PUNCHLINE.`,
        ),
      );
    }
  }

  if (reasons.length === 0) return undefined;

  return Object.freeze({
    form: word.form,
    reason: reasons[0]!,
  });
}

export function createInspectApprovedRhymes(
  deps: InspectApprovedRhymesDependencies,
): InspectApprovedRhymesService {
  return Object.freeze({
    inspect(
      request: InspectApprovedRhymesRequest,
    ): InspectApprovedRhymesResult {
      const lookupResult = deps.dictionary.findByForm({
        version: request.dictionaryVersion,
        form: request.word,
      });

      if (!lookupResult.ok) {
        return Object.freeze({
          ok: false as const,
          error: Object.freeze({
            code: "DICTIONARY_VERSION_UNAVAILABLE" as const,
            message: `La versión del diccionario "${request.dictionaryVersion}" no está disponible.`,
            version: request.dictionaryVersion,
            availableVersions: lookupResult.error.availableVersions,
          }),
        });
      }

      if (
        lookupResult.status === "missing" ||
        lookupResult.status === "pending"
      ) {
        return Object.freeze({
          ok: false as const,
          error: Object.freeze({
            code: "UNKNOWN_WORD" as const,
            message: `La palabra "${request.word}" no pertenece al snapshot solicitado.`,
            word: request.word,
          }),
        });
      }

      const wordEntry = lookupResult.entry;

      const analysisResult = deps.analyzer.analyze(request.word);

      if (!analysisResult.ok) {
        return Object.freeze({
          ok: false as const,
          error: Object.freeze({
            code: "DOUBTFUL_ANALYSIS" as const,
            message: `El análisis de la palabra "${request.word}" es dudoso.`,
            word: request.word,
            analysisError: analysisResult.error.message,
          }),
        });
      }

      const familyKey = extractRhymeKey(request.word, analysisResult);

      const allWordsResult = deps.dictionary.findAllByVersion({
        version: request.dictionaryVersion,
      });

      if (!allWordsResult.ok) {
        return Object.freeze({
          ok: false as const,
          error: Object.freeze({
            code: "DICTIONARY_VERSION_UNAVAILABLE" as const,
            message: `La versión del diccionario "${request.dictionaryVersion}" no está disponible.`,
            version: request.dictionaryVersion,
            availableVersions: allWordsResult.error.availableVersions,
          }),
        });
      }

      const familyMembers = allWordsResult.entries.filter(
        (entry) => entry.normalizedForm !== wordEntry.normalizedForm,
      );

      const candidates: InspectCandidate[] = [];
      const exclusions: InspectExclusion[] = [];

      for (const member of familyMembers) {
        const memberAnalysis = deps.analyzer.analyze(member.form);

        if (!memberAnalysis.ok) continue;

        const memberFamily = extractRhymeKey(member.form, memberAnalysis);

        if (memberFamily !== familyKey) continue;

        const exclusion = buildExclusion(
          member,
          request.category,
          request.role,
        );

        if (exclusion !== undefined) {
          exclusions.push(exclusion);
        } else {
          candidates.push(toCandidate(member));
        }
      }

      return Object.freeze({
        ok: true as const,
        value: Object.freeze({
          word: Object.freeze({
            form: wordEntry.form,
            analysis: Object.freeze({
              stressKind: analysisResult.stressKind,
              syllables: Object.freeze([...analysisResult.syllables]),
            }),
          }),
          family: Object.freeze({ key: familyKey }),
          candidates: Object.freeze([...candidates]),
          exclusions: Object.freeze([...exclusions]),
        }),
      });
    },
  });
}

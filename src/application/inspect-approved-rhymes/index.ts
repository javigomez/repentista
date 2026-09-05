import type { ApprovedWordDictionary } from "../../content/approved-word-dictionary/index.js";
import type {
  WordAnalysisPort,
  WordAnalysisResult,
} from "../../ports/index.js";
import type { ApprovedConsonantRhymeCatalog } from "../../content/approved-consonant-rhyme-catalog/index.js";

export interface InspectApprovedRhymesRequest {
  readonly word: string;
  readonly dictionaryVersion: string;
  readonly category?: string;
  readonly role?: string;
}

export type InspectApprovedRhymesErrorCode =
  "UNKNOWN_WORD" | "DICTIONARY_VERSION_UNAVAILABLE" | "DOUBTFUL_ANALYSIS" | "CATALOG_INCONSISTENCY";

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
    }
  | { readonly code: "CATALOG_INCONSISTENCY"; readonly message: string; readonly analysisKey: string; readonly catalogKey: string };

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
  readonly catalog: ApprovedConsonantRhymeCatalog;
}

export interface InspectApprovedRhymesService {
  inspect(request: InspectApprovedRhymesRequest): InspectApprovedRhymesResult;
}

function extractRhymeKey(
  word: string,
  analysis: Extract<WordAnalysisResult, { ok: true }>,
): string {
  const form = word.toLocaleLowerCase("es");
  const vowels = /[aeiouáéíóú]/iu;

  const syllables = analysis.syllables;
  const stressedIndex = analysis.stressedSyllableIndex;
  const stressedSyllable = syllables[stressedIndex] ?? "";

  let lastStressedVowelPos = -1;
  const stressedStart = form.indexOf(stressedSyllable.toLocaleLowerCase("es"));

  if (stressedStart >= 0) {
    const stressedEnd = stressedStart + stressedSyllable.length;

    for (let i = stressedStart; i < stressedEnd && i < form.length; i++) {
      if (vowels.test(form[i]!)) {
        lastStressedVowelPos = i;
      }
    }
  }

  if (lastStressedVowelPos < 0) {
    return form.normalize("NFD").replace(/\p{M}/gu, "");
  }

  return form.slice(lastStressedVowelPos).normalize("NFD").replace(/\p{M}/gu, "");
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

      const catalogFamily = deps.catalog.findFamilyByWord(request.word);
      if (catalogFamily === undefined || catalogFamily.dictionaryVersion !== request.dictionaryVersion) {
        return { ok: false as const, error: { code: "CATALOG_INCONSISTENCY", message: "La palabra no tiene familia aprobada en el catálogo solicitado.", analysisKey: familyKey, catalogKey: "" } };
      }
      if (catalogFamily.tail.value !== familyKey) {
        return { ok: false as const, error: { code: "CATALOG_INCONSISTENCY", message: "El análisis y el catálogo discrepan.", analysisKey: familyKey, catalogKey: catalogFamily.tail.value } };
      }
      const filters = {
        ...(request.category === undefined ? {} : { categories: [request.category] }),
        ...(request.role === undefined ? {} : { editorialRoles: [request.role.toLowerCase() as "preparation" | "punchline"] }),
      };
      const lookup = deps.catalog.explainRhymesForWord(request.word, filters);

      const candidates: InspectCandidate[] = [];
      const exclusions: InspectExclusion[] = [];

      for (const member of lookup.words) candidates.push({ form: member.word, category: member.category, roles: { preparation: member.editorialRoles.includes("preparation"), punchline: member.editorialRoles.includes("punchline") } });
      for (const exclusion of lookup.explanation.exclusions) exclusions.push({ form: exclusion.word, reason: exclusion });

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
          // Preserve the QG-40 public shape while sourcing the value from the
          // approved catalog rather than exposing its internal composite id.
          family: Object.freeze({ key: catalogFamily.tail.value }),
          candidates: Object.freeze([...candidates]),
          exclusions: Object.freeze([...exclusions]),
        }),
      });
    },
  });
}

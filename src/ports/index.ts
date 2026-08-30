/** Public entrypoint for provider-neutral ports. */

export type WordStressKind = "aguda" | "llana";

export interface WordAnalysisVersions {
  readonly adapter: string;
  readonly library: string;
}

export interface WordPhoneticPhenomena {
  readonly diphthongs: readonly string[];
  readonly hiatuses: readonly string[];
  readonly triphthongs: readonly string[];
}

export interface TrustedWordAnalysis {
  readonly ok: true;
  readonly form: string;
  readonly syllables: readonly string[];
  readonly stressedSyllableIndex: number;
  readonly stressKind: WordStressKind;
  readonly phenomena: WordPhoneticPhenomena;
  readonly versions: WordAnalysisVersions;
}

export type WordAnalysisErrorCode =
  | "INCONSISTENT_RESULT"
  | "LIBRARY_ERROR"
  | "UNSUPPORTED_STRESS_KIND";

export interface UntrustedWordAnalysis {
  readonly ok: false;
  readonly form: string;
  readonly error: {
    readonly code: WordAnalysisErrorCode;
    readonly message: string;
  };
  readonly versions: WordAnalysisVersions;
}

export type WordAnalysisResult = TrustedWordAnalysis | UntrustedWordAnalysis;

export interface WordAnalysisPort {
  analyze(word: string): WordAnalysisResult;
}

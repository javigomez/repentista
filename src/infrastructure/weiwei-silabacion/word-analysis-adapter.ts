import type {
  WordAnalysisErrorCode,
  WordAnalysisPort,
  WordAnalysisResult,
  WordAnalysisVersions,
} from "../../ports/index.js";
import { WEIWEI_SILABACION_DEPENDENCY } from "./dependency-metadata.js";

export const WEIWEI_SILABACION_ADAPTER_VERSION = "weiwei-silabacion-adapter/0.1.0";

export interface WeiweiSilabacionWordLike {
  readonly syllables: unknown;
  readonly stress: unknown;
  readonly tonic: unknown;
  readonly hiatuses: unknown;
  readonly diphthongs: unknown;
  readonly triphthongs: unknown;
}

export type WeiweiSilabacionWordFactory = (word: string) => WeiweiSilabacionWordLike;

export interface WeiweiSilabacionAnalyzerOptions {
  readonly createWord?: WeiweiSilabacionWordFactory;
}

const versions: WordAnalysisVersions = Object.freeze({
  adapter: WEIWEI_SILABACION_ADAPTER_VERSION,
  library: `${WEIWEI_SILABACION_DEPENDENCY.packageName}/${WEIWEI_SILABACION_DEPENDENCY.packageVersion}`,
});

function untrusted(
  form: string,
  code: WordAnalysisErrorCode,
  message: string,
): WordAnalysisResult {
  return Object.freeze({
    ok: false as const,
    form,
    error: Object.freeze({ code, message }),
    versions,
  });
}

export function createWeiweiSilabacionWordAnalyzer(
  _options: WeiweiSilabacionAnalyzerOptions = {},
): WordAnalysisPort {
  return Object.freeze({
    analyze(word: string): WordAnalysisResult {
      return untrusted(word, "LIBRARY_ERROR", "silabacion adapter is not implemented yet.");
    },
  });
}

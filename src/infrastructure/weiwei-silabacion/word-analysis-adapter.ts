import { createRequire } from "node:module";

import type {
  WordAnalysisErrorCode,
  WordAnalysisPort,
  WordAnalysisResult,
  WordAnalysisVersions,
  WordStressKind,
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

type UnknownRecord = Record<string, unknown>;
type WeiweiSilabacionWordConstructor = new (word: string) => WeiweiSilabacionWordLike;

const requireSilabacion = createRequire(import.meta.url);

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

function defaultCreateWord(word: string): WeiweiSilabacionWordLike {
  const module = requireSilabacion("silabacion") as UnknownRecord;
  const Word = module.Word;

  if (!isWordConstructor(Word)) {
    throw new Error("silabacion does not expose the expected Word constructor.");
  }

  return new Word(word);
}

function isWordConstructor(value: unknown): value is WeiweiSilabacionWordConstructor {
  return typeof value === "function";
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "silabacion failed with a non-Error value.";
}

function translateWordAnalysis(
  form: string,
  word: WeiweiSilabacionWordLike,
): WordAnalysisResult {
  const syllables = normalizeSyllables(word.syllables);

  if (!syllables) {
    return untrusted(form, "INCONSISTENT_RESULT", "silabacion returned invalid syllables.");
  }

  const stressKind = normalizeStressKind(word.stress);

  if (stressKind === undefined) {
    return untrusted(form, "INCONSISTENT_RESULT", "silabacion returned invalid stress data.");
  }

  if (stressKind === "unsupported") {
    return untrusted(form, "UNSUPPORTED_STRESS_KIND", "silabacion returned an unsupported stress kind.");
  }

  const stressedSyllableIndex = normalizeTonicIndex(word.tonic, syllables, stressKind);

  if (stressedSyllableIndex === undefined) {
    return untrusted(
      form,
      "INCONSISTENT_RESULT",
      "silabacion returned an incompatible tonic syllable.",
    );
  }

  const diphthongs = normalizePhenomena(word.diphthongs);
  const hiatuses = normalizePhenomena(word.hiatuses);
  const triphthongs = normalizePhenomena(word.triphthongs);

  if (!diphthongs || !hiatuses || !triphthongs) {
    return untrusted(
      form,
      "INCONSISTENT_RESULT",
      "silabacion returned invalid phonetic phenomena.",
    );
  }

  return Object.freeze({
    ok: true as const,
    form,
    syllables,
    stressedSyllableIndex,
    stressKind,
    phenomena: Object.freeze({
      diphthongs,
      hiatuses,
      triphthongs,
    }),
    versions,
  });
}

function normalizeSyllables(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  const syllables = value.map(normalizeSyllable);

  if (syllables.some((item) => item === undefined)) {
    return undefined;
  }

  return Object.freeze([...syllables]) as readonly string[];
}

function normalizeSyllable(value: unknown): string | undefined {
  if (typeof value === "string") {
    return normalizeNonBlankString(value);
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const onset = value.onset;
  const nucleus = value.nucleus;
  const coda = value.coda;

  if (
    typeof onset !== "string" ||
    typeof nucleus !== "string" ||
    typeof coda !== "string"
  ) {
    return undefined;
  }

  if (normalizeNonBlankString(nucleus) === undefined) {
    return undefined;
  }

  return normalizeNonBlankString(`${onset}${nucleus}${coda}`);
}

function normalizeStressKind(value: unknown): WordStressKind | "unsupported" | undefined {
  const numericStressKind = normalizeStressNumber(value);

  if (numericStressKind !== undefined) {
    return numericStressKind;
  }

  const normalized = normalizeStressLabel(value);

  if (!normalized) {
    return undefined;
  }

  if (
    normalized.includes("esdrujula") ||
    normalized.includes("sobreesdrujula") ||
    normalized.includes("proparoxytone") ||
    normalized.includes("superproparoxytone")
  ) {
    return "unsupported";
  }

  if (normalized.includes("aguda") || normalized.includes("oxytone")) {
    return "aguda";
  }

  if (
    normalized.includes("llana") ||
    normalized.includes("grave") ||
    normalized.includes("paroxytone")
  ) {
    return "llana";
  }

  return undefined;
}

function normalizeStressNumber(value: unknown): WordStressKind | "unsupported" | undefined {
  const numericValue = typeof value === "number" ? value : numericValueFromRecord(value);

  if (numericValue === undefined) {
    return undefined;
  }

  if (numericValue === 1) {
    return "aguda";
  }

  if (numericValue === 2) {
    return "llana";
  }

  if (numericValue === 3 || numericValue === 4) {
    return "unsupported";
  }

  return undefined;
}

function numericValueFromRecord(value: unknown): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const candidate = value.value;

  return typeof candidate === "number" ? candidate : undefined;
}

function normalizeStressLabel(value: unknown): string | undefined {
  if (typeof value === "string") {
    return normalizeIdentifier(value);
  }

  if (!isRecord(value)) {
    return undefined;
  }

  for (const key of ["value", "name", "kind", "label"]) {
    const candidate = value[key];

    if (typeof candidate === "string") {
      return normalizeIdentifier(candidate);
    }
  }

  return undefined;
}

function normalizeIdentifier(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function normalizeTonicIndex(
  value: unknown,
  syllables: readonly string[],
  stressKind: WordStressKind,
): number | undefined {
  // silabacion's tonic field is a syllable object, not a stable index; derive ours from stress.
  const expectedIndex = expectedTonicIndex(stressKind, syllables.length);

  if (expectedIndex === undefined) {
    return undefined;
  }

  const candidates = tonicIndexCandidates(value, syllables);

  if (candidates.length === 0) {
    return expectedIndex;
  }

  return candidates.includes(expectedIndex) ? expectedIndex : undefined;
}

function tonicIndexCandidates(value: unknown, syllables: readonly string[]): number[] {
  if (typeof value === "number") {
    return numericTonicIndexCandidates(value);
  }

  if (typeof value !== "string") {
    return [];
  }

  const numericValue = Number(value);

  if (Number.isInteger(numericValue)) {
    return numericTonicIndexCandidates(numericValue);
  }

  const matchingIndex = syllables.findIndex((syllable) => syllable === value);

  return matchingIndex === -1 ? [] : [matchingIndex];
}

function numericTonicIndexCandidates(value: number): number[] {
  return value === 0 ? [0] : [value, value - 1];
}

function expectedTonicIndex(stressKind: WordStressKind, syllableCount: number): number | undefined {
  if (stressKind === "aguda") {
    return syllableCount === 0 ? undefined : syllableCount - 1;
  }

  return syllableCount < 2 ? undefined : syllableCount - 2;
}

function normalizePhenomena(value: unknown): readonly string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const phenomena = value.map(normalizePhenomenon);

  if (phenomena.some((item) => item === undefined || item.length === 0)) {
    return undefined;
  }

  return Object.freeze([...phenomena]) as readonly string[];
}

function normalizePhenomenon(value: unknown): string | undefined {
  if (typeof value === "string") {
    return normalizeNonBlankString(value);
  }

  if (!isRecord(value)) {
    return undefined;
  }

  for (const key of ["composite", "value", "text", "form", "sequence", "letters"]) {
    const candidate = value[key];

    if (typeof candidate === "string") {
      return normalizeNonBlankString(candidate);
    }
  }

  const vowels = value.vowels;

  if (Array.isArray(vowels) && vowels.every((item) => typeof item === "string")) {
    return normalizeNonBlankString(vowels.join(""));
  }

  const stringified = value.toString();

  return stringified === "[object Object]" ? undefined : normalizeNonBlankString(stringified);
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function normalizeNonBlankString(value: string): string | undefined {
  return value.trim().length === 0 ? undefined : value;
}

export function createWeiweiSilabacionWordAnalyzer(
  options: WeiweiSilabacionAnalyzerOptions = {},
): WordAnalysisPort {
  const createWord = options.createWord ?? defaultCreateWord;

  return Object.freeze({
    analyze(word: string): WordAnalysisResult {
      try {
        return translateWordAnalysis(word, createWord(word));
      } catch (error) {
        return untrusted(word, "LIBRARY_ERROR", `silabacion failed: ${errorMessage(error)}`);
      }
    },
  });
}

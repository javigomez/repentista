export const GENERATION_BRIEF_DEFAULTS = Object.freeze({
  tone: "",
  candidateCount: 100,
  topK: 5,
  minimumScore: 80,
  scheme: "0-A-0-A",
  rhyme: "consonant",
  metricPositions: 7,
} as const);

export type GenerationScheme = typeof GENERATION_BRIEF_DEFAULTS.scheme;
export type RhymeKind = typeof GENERATION_BRIEF_DEFAULTS.rhyme;
export type MetricPositions = typeof GENERATION_BRIEF_DEFAULTS.metricPositions;

export interface GenerationBriefInput {
  readonly context: string;
  readonly tone?: string;
  readonly candidateCount?: number;
  readonly topK?: number;
  readonly minimumScore?: number;
  readonly scheme?: string;
  readonly rhyme?: string;
  readonly metricPositions?: number;
}

export interface GenerationBrief {
  readonly context: string;
  readonly tone: string;
  readonly candidateCount: number;
  readonly topK: number;
  readonly minimumScore: number;
  readonly scheme: GenerationScheme;
  readonly rhyme: RhymeKind;
  readonly metricPositions: MetricPositions;
}

export interface BriefValidationError {
  readonly field: keyof GenerationBriefInput;
  readonly code: string;
  readonly message: string;
}

export type GenerationBriefResult =
  | { readonly ok: true; readonly value: GenerationBrief }
  | { readonly ok: false; readonly errors: readonly BriefValidationError[] };

const normalizeText = (value: string): string => value.trim().replace(/\s+/gu, " ");

const error = (
  field: keyof GenerationBriefInput,
  code: string,
  message: string,
): BriefValidationError => Object.freeze({ field, code, message });

const isIntegerInRange = (value: number, minimum: number, maximum: number): boolean =>
  Number.isInteger(value) && value >= minimum && value <= maximum;

export function createGenerationBrief(input: GenerationBriefInput): GenerationBriefResult {
  const errors: BriefValidationError[] = [];
  const context = normalizeText(input.context);
  const tone = input.tone === undefined ? GENERATION_BRIEF_DEFAULTS.tone : normalizeText(input.tone);
  const candidateCount = input.candidateCount ?? GENERATION_BRIEF_DEFAULTS.candidateCount;
  const topK = input.topK ?? GENERATION_BRIEF_DEFAULTS.topK;
  const minimumScore = input.minimumScore ?? GENERATION_BRIEF_DEFAULTS.minimumScore;
  const scheme = input.scheme ?? GENERATION_BRIEF_DEFAULTS.scheme;
  const rhyme = input.rhyme ?? GENERATION_BRIEF_DEFAULTS.rhyme;
  const metricPositions = input.metricPositions ?? GENERATION_BRIEF_DEFAULTS.metricPositions;

  if (context.length === 0) {
    errors.push(error("context", "EMPTY_CONTEXT", "El contexto no puede estar vacío."));
  }
  if (input.tone !== undefined && tone.length === 0) {
    errors.push(error("tone", "EMPTY_TONE", "El tono no puede estar vacío."));
  }
  if (!isIntegerInRange(candidateCount, 1, 1000)) {
    errors.push(error("candidateCount", "INVALID_RANGE", "candidateCount debe ser un entero entre 1 y 1000."));
  }
  if (!isIntegerInRange(topK, 1, 1000) || topK > candidateCount) {
    errors.push(error("topK", "INVALID_RANGE", "topK debe ser positivo y no superar candidateCount."));
  }
  if (!Number.isFinite(minimumScore) || minimumScore < 0 || minimumScore > 100) {
    errors.push(error("minimumScore", "INVALID_RANGE", "minimumScore debe estar entre 0 y 100."));
  }
  if (scheme !== GENERATION_BRIEF_DEFAULTS.scheme) {
    errors.push(error("scheme", "UNSUPPORTED_SCHEME", "Solo se admite el esquema 0-A-0-A."));
  }
  if (rhyme !== GENERATION_BRIEF_DEFAULTS.rhyme) {
    errors.push(error("rhyme", "UNSUPPORTED_RHYME", "Solo se admite la rima consonante."));
  }
  if (metricPositions !== GENERATION_BRIEF_DEFAULTS.metricPositions) {
    errors.push(error("metricPositions", "UNSUPPORTED_METRIC", "Solo se admiten siete posiciones métricas."));
  }

  if (errors.length > 0) {
    return Object.freeze({ ok: false as const, errors: Object.freeze(errors) });
  }

  const value: GenerationBrief = Object.freeze({
    context,
    tone,
    candidateCount,
    topK,
    minimumScore,
    scheme: GENERATION_BRIEF_DEFAULTS.scheme,
    rhyme: GENERATION_BRIEF_DEFAULTS.rhyme,
    metricPositions: GENERATION_BRIEF_DEFAULTS.metricPositions,
  });

  return Object.freeze({ ok: true as const, value });
}

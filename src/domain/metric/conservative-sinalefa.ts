export const CONSERVATIVE_SINALEFA_POLICY_VERSION = "conservative-sinalefa-0.1.0";

export type SinalefaBoundaryClassification = "APLICADA" | "NO_APLICADA" | "DUDOSA";
export type SinalefaBoundaryConfidence = "ALTA" | "MEDIA" | "BAJA";
export type FinalStressType = "AGUDA" | "LLANA";
export type PauseStrength = "SOFT" | "STRONG";
export type ProhibitedMetricLicense = "DIERESIS" | "SINERESIS" | "FORCED_HIATUS";

export interface SyllableAnalysis {
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface WordAnalysis {
  readonly text: string;
  readonly normalized: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly syllables: readonly SyllableAnalysis[];
  readonly stressIndex: number;
  readonly finalStressType: FinalStressType;
}

export interface VowelEvidence {
  readonly tokenIndex: number;
  readonly syllableIndex: number;
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface PunctuationEvidence {
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly pauseStrength: PauseStrength;
}

export interface SinalefaBoundary {
  readonly leftTokenIndex: number;
  readonly rightTokenIndex: number;
  readonly classification: SinalefaBoundaryClassification;
  readonly ruleId: string;
  readonly reason: string;
  readonly confidence: SinalefaBoundaryConfidence;
  readonly leftVowel: VowelEvidence;
  readonly rightVowel: VowelEvidence;
  readonly punctuationBetween: readonly PunctuationEvidence[];
  readonly affectedSyllables: readonly [SyllableAnalysis, SyllableAnalysis];
}

export interface ConservativeSinalefaDetectionInput {
  readonly verse: string;
  readonly tokens: readonly WordAnalysis[];
  readonly policyVersion?: typeof CONSERVATIVE_SINALEFA_POLICY_VERSION;
}

export interface ConservativeSinalefaDetectionSummary {
  readonly appliedCount: number;
  readonly notAppliedCount: number;
  readonly doubtfulCount: number;
}

export interface ConservativeSinalefaDetectionResult {
  readonly policyVersion: typeof CONSERVATIVE_SINALEFA_POLICY_VERSION;
  readonly tokens: readonly WordAnalysis[];
  readonly boundaries: readonly SinalefaBoundary[];
  readonly confidence: SinalefaBoundaryConfidence;
  readonly summary: ConservativeSinalefaDetectionSummary;
}

const STRONG_PAUSES = new Set([".", ";", ":", "!", "?", "¡", "¿"]);
const SOFT_PAUSES = new Set([","]);

const stripAccents = (value: string): string =>
  value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("es");

const isVowel = (value: string): boolean => {
  const normalized = stripAccents(value);
  return normalized === "a" || normalized === "e" || normalized === "i" || normalized === "o" || normalized === "u";
};

const pauseStrengthFor = (value: string): PauseStrength | undefined => {
  if (STRONG_PAUSES.has(value)) return "STRONG";
  if (SOFT_PAUSES.has(value)) return "SOFT";
  return undefined;
};

const syllableIndexForOffset = (token: WordAnalysis, offset: number): number =>
  token.syllables.findIndex(
    (syllable) => offset >= syllable.startOffset && offset < syllable.endOffset,
  );

const isConjunctionY = (token: WordAnalysis): boolean => stripAccents(token.normalized) === "y";

const startsWithSilentHPlusVowel = (token: WordAnalysis): boolean => {
  const normalized = stripAccents(token.normalized);
  return normalized.startsWith("h") && normalized.length > 1 && isVowel(normalized[1] ?? "");
};

const findInitialVowelEvidence = (token: WordAnalysis, tokenIndex: number): VowelEvidence | undefined => {
  if (isConjunctionY(token)) {
    const syllableIndex = syllableIndexForOffset(token, token.startOffset);
    if (syllableIndex < 0) return undefined;

    return Object.freeze({
      tokenIndex,
      syllableIndex,
      text: token.text.slice(0, 1),
      startOffset: token.startOffset,
      endOffset: token.startOffset + 1,
    });
  }

  const relativeOffset = startsWithSilentHPlusVowel(token) ? 1 : 0;
  const vowel = token.text.slice(relativeOffset, relativeOffset + 1);
  if (!isVowel(vowel)) return undefined;

  const startOffset = token.startOffset + relativeOffset;
  const syllableIndex = syllableIndexForOffset(token, startOffset);
  if (syllableIndex < 0) return undefined;

  return Object.freeze({
    tokenIndex,
    syllableIndex,
    text: vowel,
    startOffset,
    endOffset: startOffset + 1,
  });
};

const findFinalVowelEvidence = (token: WordAnalysis, tokenIndex: number): VowelEvidence | undefined => {
  if (token.text.length === 0) return undefined;

  const relativeOffset = token.text.length - 1;
  const vowel = token.text.slice(relativeOffset);
  if (!isVowel(vowel) && stripAccents(vowel) !== "y") return undefined;

  const startOffset = token.startOffset + relativeOffset;
  const syllableIndex = syllableIndexForOffset(token, startOffset);
  if (syllableIndex < 0) return undefined;

  return Object.freeze({
    tokenIndex,
    syllableIndex,
    text: vowel,
    startOffset,
    endOffset: token.endOffset,
  });
};

const punctuationBetween = (
  verse: string,
  startOffset: number,
  endOffset: number,
): readonly PunctuationEvidence[] => {
  const punctuation: PunctuationEvidence[] = [];

  for (let index = startOffset; index < endOffset; index += 1) {
    const text = verse.slice(index, index + 1);
    const pauseStrength = pauseStrengthFor(text);
    if (pauseStrength !== undefined) {
      punctuation.push(
        Object.freeze({
          text,
          startOffset: index,
          endOffset: index + 1,
          pauseStrength,
        }),
      );
    }
  }

  return Object.freeze(punctuation);
};

const classifyBoundary = (
  rightToken: WordAnalysis,
  leftVowel: VowelEvidence,
  rightVowel: VowelEvidence,
  punctuation: readonly PunctuationEvidence[],
): Pick<SinalefaBoundary, "classification" | "ruleId" | "reason" | "confidence"> => {
  if (punctuation.some((mark) => mark.pauseStrength === "STRONG")) {
    return {
      classification: "DUDOSA",
      ruleId: "strong-punctuation-requires-editorial-review/v1",
      reason: "strong pause cannot be used as a silent metric reduction",
      confidence: "BAJA",
    };
  }

  if (punctuation.some((mark) => mark.pauseStrength === "SOFT")) {
    return {
      classification: "NO_APLICADA",
      ruleId: "soft-punctuation-blocks-natural-join/v1",
      reason: "comma preserves an editorial pause between vowel sounds",
      confidence: "ALTA",
    };
  }

  if (isConjunctionY(rightToken)) {
    return {
      classification: "APLICADA",
      ruleId: "conjunction-y-vowel-sound/v1",
      reason: "final vowel joins conjunction y when no pause intervenes",
      confidence: "ALTA",
    };
  }

  if (startsWithSilentHPlusVowel(rightToken)) {
    return {
      classification: "APLICADA",
      ruleId: "natural-final-initial-vowel/v1",
      reason: "final vowel joins initial h plus vowel without pause",
      confidence: "ALTA",
    };
  }

  return {
    classification: "APLICADA",
    ruleId: "natural-final-initial-vowel/v1",
    reason:
      leftVowel.text === rightVowel.text
        ? "natural adjacent vowel sounds join when no pause intervenes"
        : "final vowel joins initial vowel without pause",
    confidence: "ALTA",
  };
};

const aggregateConfidence = (
  boundaries: readonly SinalefaBoundary[],
): SinalefaBoundaryConfidence => {
  if (boundaries.some((boundary) => boundary.confidence === "BAJA")) return "BAJA";
  if (boundaries.some((boundary) => boundary.confidence === "MEDIA")) return "MEDIA";
  return "ALTA";
};

const createSummary = (
  boundaries: readonly SinalefaBoundary[],
): ConservativeSinalefaDetectionSummary =>
  Object.freeze({
    appliedCount: boundaries.filter((boundary) => boundary.classification === "APLICADA").length,
    notAppliedCount: boundaries.filter((boundary) => boundary.classification === "NO_APLICADA").length,
    doubtfulCount: boundaries.filter((boundary) => boundary.classification === "DUDOSA").length,
  });

export function detectConservativeSinalefaBoundaries(
  input: ConservativeSinalefaDetectionInput,
): ConservativeSinalefaDetectionResult {
  const boundaries: SinalefaBoundary[] = [];

  for (let leftTokenIndex = 0; leftTokenIndex < input.tokens.length - 1; leftTokenIndex += 1) {
    const rightTokenIndex = leftTokenIndex + 1;
    const leftToken = input.tokens[leftTokenIndex];
    const rightToken = input.tokens[rightTokenIndex];
    if (leftToken === undefined || rightToken === undefined) continue;

    const leftVowel = findFinalVowelEvidence(leftToken, leftTokenIndex);
    const rightVowel = findInitialVowelEvidence(rightToken, rightTokenIndex);
    if (leftVowel === undefined || rightVowel === undefined) continue;

    const punctuation = punctuationBetween(input.verse, leftToken.endOffset, rightToken.startOffset);
    const classification = classifyBoundary(rightToken, leftVowel, rightVowel, punctuation);
    const leftSyllable = leftToken.syllables[leftVowel.syllableIndex];
    const rightSyllable = rightToken.syllables[rightVowel.syllableIndex];
    if (leftSyllable === undefined || rightSyllable === undefined) continue;

    const affectedSyllables: readonly [SyllableAnalysis, SyllableAnalysis] = Object.freeze([
      leftSyllable,
      rightSyllable,
    ]);
    const boundary: SinalefaBoundary = Object.freeze({
      leftTokenIndex,
      rightTokenIndex,
      ...classification,
      leftVowel,
      rightVowel,
      punctuationBetween: punctuation,
      affectedSyllables,
    });

    boundaries.push(boundary);
  }

  const frozenBoundaries = Object.freeze(boundaries);

  return Object.freeze({
    policyVersion: input.policyVersion ?? CONSERVATIVE_SINALEFA_POLICY_VERSION,
    tokens: input.tokens,
    boundaries: frozenBoundaries,
    confidence: aggregateConfidence(frozenBoundaries),
    summary: createSummary(frozenBoundaries),
  });
}

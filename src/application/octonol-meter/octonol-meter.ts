import type { WordAnalysisPort } from "../../ports/index.js";
import type {
  ValidationVerdict,
  ValidatorDiagnosticInput,
} from "../../domain/quatrain-candidate/index.js";
import {
  detectConservativeSinalefaBoundaries,
  type FinalStressType,
  type SinalefaBoundary,
  type SinalefaBoundaryClassification,
  type SinalefaBoundaryConfidence,
  type SyllableAnalysis,
  type WordAnalysis,
} from "../../domain/metric/conservative-sinalefa.js";

export const OCTONOL_METER_VALIDATOR_NAME = "octonol-meter";
export const OCTONOL_METER_VALIDATOR_VERSION = "octonol-meter-validator/0.1.0";
export const OCTONOL_METER_TARGET_POSITIONS = 7;

export type OctonolMeterVerdict = ValidationVerdict;
export type OctonolMeterConfidence = SinalefaBoundaryConfidence;
export type OctonolMeterFinalStressType = FinalStressType;

export interface OctonolMeterScansionWord {
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly syllables: readonly string[];
  readonly stressedSyllableIndex: number;
  readonly finalStressType: OctonolMeterFinalStressType;
}

export interface OctonolMeterBoundary {
  readonly leftWordIndex: number;
  readonly rightWordIndex: number;
  readonly classification: SinalefaBoundaryClassification;
  readonly joined: string;
  readonly ruleId: string;
  readonly reason: string;
  readonly confidence: SinalefaBoundaryConfidence;
}

export interface OctonolMeterReading {
  readonly positionsToLastStress: number;
  readonly phoneticSyllableCount: number;
  readonly appliedSinalefaCount: number;
}

export interface OctonolMeterResult {
  readonly validator: string;
  readonly version: string;
  readonly verse: string;
  readonly verdict: OctonolMeterVerdict;
  readonly confidence: OctonolMeterConfidence;
  readonly targetPositions: number;
  readonly reason?: string;
  readonly words: readonly OctonolMeterScansionWord[];
  readonly boundaries: readonly OctonolMeterBoundary[];
  readonly sinalefas: readonly string[];
  readonly doubtfulSinalefas: readonly string[];
  readonly segmentation?: string;
  readonly lastStress?: string;
  readonly finalStressType?: OctonolMeterFinalStressType;
  readonly positionsToLastStress?: number;
  readonly phoneticSyllableCount?: number;
  readonly difference?: number;
  readonly readings: readonly OctonolMeterReading[];
}

export interface OctonolMeterValidatorOptions {
  readonly analyzer: WordAnalysisPort;
  readonly targetPositions?: number;
}

export interface OctonolMeterValidator {
  readonly validator: string;
  readonly version: string;
  validate(verse: string): OctonolMeterResult;
}

interface WordSpan {
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

interface AnalyzedWord extends WordSpan {
  readonly syllables: readonly string[];
  readonly stressedSyllableIndex: number;
  readonly stressKind: "aguda" | "llana";
}

interface DistributedWord extends AnalyzedWord {
  readonly metricSyllables: readonly SyllableAnalysis[];
  readonly finalStressType: OctonolMeterFinalStressType;
}

interface CountResult {
  readonly lexicalSyllableCount: number;
  readonly appliedSinalefaCount: number;
  readonly doubtfulSinalefaCount: number;
  readonly phoneticSyllableCount: number;
  readonly positionsToLastStress: number;
}

interface WordAnalysisFailure {
  readonly form: string;
  readonly code: string;
}

type WordAnalysisOutcome =
  | { readonly ok: true; readonly words: readonly DistributedWord[] }
  | { readonly ok: false; readonly failure: WordAnalysisFailure };

const WORD_CHARACTER_PATTERN = /[\p{L}\p{M}]+/gu;

const finalStressTypeFor = (stressKind: "aguda" | "llana"): OctonolMeterFinalStressType =>
  stressKind === "aguda" ? "AGUDA" : "LLANA";

function tokenizeWords(verse: string): readonly WordSpan[] {
  const words: WordSpan[] = [];

  for (const match of verse.matchAll(WORD_CHARACTER_PATTERN)) {
    const text = match[0];
    const startOffset = match.index;

    if (text === undefined || startOffset === undefined) {
      continue;
    }

    words.push(
      Object.freeze({ text, startOffset, endOffset: startOffset + text.length }),
    );
  }

  return Object.freeze(words);
}

function distributeSyllables(
  word: WordSpan,
  syllables: readonly string[],
): readonly SyllableAnalysis[] | undefined {
  const distributed: SyllableAnalysis[] = [];
  let cursor = 0;

  for (const syllable of syllables) {
    if (word.text.indexOf(syllable, cursor) !== cursor) {
      return undefined;
    }

    distributed.push(
      Object.freeze({
        text: syllable,
        startOffset: word.startOffset + cursor,
        endOffset: word.startOffset + cursor + syllable.length,
      }),
    );
    cursor += syllable.length;
  }

  if (cursor !== word.text.length) {
    return undefined;
  }

  return Object.freeze(distributed);
}

function analyzeWords(
  verse: string,
  analyzer: WordAnalysisPort,
): WordAnalysisOutcome {
  const analyzed: DistributedWord[] = [];

  for (const span of tokenizeWords(verse)) {
    const result = analyzer.analyze(span.text);

    if (!result.ok) {
      return Object.freeze({
        ok: false as const,
        failure: Object.freeze({ form: span.text, code: result.error.code }),
      });
    }

    const metricSyllables = distributeSyllables(span, result.syllables);

    if (metricSyllables === undefined) {
      return Object.freeze({
        ok: false as const,
        failure: Object.freeze({
          form: span.text,
          code: "SYLLABLE_OFFSET_MISMATCH",
        }),
      });
    }

    analyzed.push(
      Object.freeze({
        ...span,
        syllables: result.syllables,
        stressedSyllableIndex: result.stressedSyllableIndex,
        stressKind: result.stressKind,
        metricSyllables,
        finalStressType: finalStressTypeFor(result.stressKind),
      }),
    );
  }

  return Object.freeze({ ok: true as const, words: Object.freeze(analyzed) });
}

function toMetricTokens(words: readonly DistributedWord[]): readonly WordAnalysis[] {
  return Object.freeze(
    words.map((word) =>
      Object.freeze({
        text: word.text,
        normalized: word.text,
        startOffset: word.startOffset,
        endOffset: word.endOffset,
        syllables: word.metricSyllables,
        stressIndex: word.stressedSyllableIndex,
        finalStressType: word.finalStressType,
      }),
    ),
  );
}

function toBoundaryView(boundary: SinalefaBoundary): OctonolMeterBoundary {
  const [leftSyllable, rightSyllable] = boundary.affectedSyllables;

  return Object.freeze({
    leftWordIndex: boundary.leftTokenIndex,
    rightWordIndex: boundary.rightTokenIndex,
    classification: boundary.classification,
    joined: `${leftSyllable.text}_${rightSyllable.text}`,
    ruleId: boundary.ruleId,
    reason: boundary.reason,
    confidence: boundary.confidence,
  });
}

function reading(
  positionsToLastStress: number,
  phoneticSyllableCount: number,
  appliedSinalefaCount: number,
): OctonolMeterReading {
  return Object.freeze({
    positionsToLastStress,
    phoneticSyllableCount,
    appliedSinalefaCount,
  });
}

function countPositions(
  words: readonly DistributedWord[],
  boundaries: readonly OctonolMeterBoundary[],
): CountResult {
  const lexicalSyllableCount = words.reduce(
    (total, word) => total + word.syllables.length,
    0,
  );
  const appliedSinalefaCount = boundaries.filter(
    (boundary) => boundary.classification === "APLICADA",
  ).length;
  const doubtfulSinalefaCount = boundaries.filter(
    (boundary) => boundary.classification === "DUDOSA",
  ).length;
  const finalWord = words[words.length - 1];
  const postTonicSyllables = finalWord === undefined || finalWord.stressKind === "llana" ? 1 : 0;
  const phoneticSyllableCount = lexicalSyllableCount - appliedSinalefaCount;
  const positionsToLastStress = phoneticSyllableCount - postTonicSyllables;

  return Object.freeze({
    lexicalSyllableCount,
    appliedSinalefaCount,
    doubtfulSinalefaCount,
    phoneticSyllableCount,
    positionsToLastStress,
  });
}

function buildSegmentation(
  words: readonly DistributedWord[],
  boundaries: readonly OctonolMeterBoundary[],
  lastStressSyllableIndex: number,
): string {
  const flattened: string[] = [];
  const wordStartIndex: number[] = [];

  for (const word of words) {
    wordStartIndex.push(flattened.length);
    flattened.push(...word.syllables);
  }

  const joinIndexes = new Set<number>();

  for (const boundary of boundaries) {
    if (boundary.classification !== "APLICADA") {
      continue;
    }

    const leftWord = words[boundary.leftWordIndex];
    if (leftWord === undefined) continue;

    const leftLastIndex = wordStartIndex[boundary.leftWordIndex] + leftWord.syllables.length - 1;
    joinIndexes.add(leftLastIndex);
  }

  const lastStressFlatIndex = wordStartIndex[words.length - 1] + lastStressSyllableIndex;
  const parts: string[] = [];

  flattened.forEach((syllable, index) => {
    parts.push(index === lastStressFlatIndex ? syllable.toUpperCase() : syllable);

    if (index < flattened.length - 1) {
      parts.push(joinIndexes.has(index) ? "_" : "-");
    }
  });

  return parts.join("");
}

function invalidResult(
  verse: string,
  targetPositions: number,
  reason: string,
): OctonolMeterResult {
  return Object.freeze({
    validator: OCTONOL_METER_VALIDATOR_NAME,
    version: OCTONOL_METER_VALIDATOR_VERSION,
    verse,
    verdict: "INVALIDO" as const,
    confidence: "ALTA" as const,
    targetPositions,
    reason,
    words: Object.freeze([]),
    boundaries: Object.freeze([]),
    sinalefas: Object.freeze([]),
    doubtfulSinalefas: Object.freeze([]),
    readings: Object.freeze([]),
  });
}

function analyzeResult(
  verse: string,
  targetPositions: number,
  words: readonly DistributedWord[],
  boundaries: readonly OctonolMeterBoundary[],
): OctonolMeterResult {
  const count = countPositions(words, boundaries);
  const lastWord = words[words.length - 1];
  const lastStressSyllableIndex =
    lastWord === undefined ? 0 : lastWord.stressedSyllableIndex;
  const lastStressSyllable =
    lastWord === undefined ? undefined : lastWord.syllables[lastStressSyllableIndex];
  const finalStressType = lastWord === undefined ? undefined : lastWord.finalStressType;

  const conservativePositions = count.positionsToLastStress;
  const permissivePositions = conservativePositions - count.doubtfulSinalefaCount;

  let verdict: OctonolMeterVerdict;
  let reason: string | undefined;

  if (count.doubtfulSinalefaCount > 0) {
    if (conservativePositions === targetPositions || permissivePositions === targetPositions) {
      verdict = "DUDOSO";
      reason = "la métrica depende de una sinalefa dudosa y conserva ambas lecturas";
    } else {
      verdict = "INVALIDO";
      reason = "el recuento métrico no alcanza siete posiciones en ninguna lectura";
    }
  } else if (conservativePositions === targetPositions) {
    verdict = "VALIDO";
  } else {
    verdict = "INVALIDO";
  }

  const readings: OctonolMeterReading[] = [
    reading(
      conservativePositions,
      count.phoneticSyllableCount,
      count.appliedSinalefaCount,
    ),
  ];

  if (count.doubtfulSinalefaCount > 0) {
    readings.push(
      reading(
        permissivePositions,
        count.phoneticSyllableCount - count.doubtfulSinalefaCount,
        count.appliedSinalefaCount + count.doubtfulSinalefaCount,
      ),
    );
  }

  const appliedJoins = boundaries
    .filter((boundary) => boundary.classification === "APLICADA")
    .map((boundary) => boundary.joined);
  const doubtfulJoins = boundaries
    .filter((boundary) => boundary.classification === "DUDOSA")
    .map((boundary) => boundary.joined);

  const segmentation = buildSegmentation(words, boundaries, lastStressSyllableIndex);

  return Object.freeze({
    validator: OCTONOL_METER_VALIDATOR_NAME,
    version: OCTONOL_METER_VALIDATOR_VERSION,
    verse,
    verdict,
    confidence: boundaries.some((boundary) => boundary.confidence === "BAJA")
      ? "BAJA"
      : "ALTA",
    targetPositions,
    ...(reason === undefined ? {} : { reason }),
    words: Object.freeze(
      words.map((word) =>
        Object.freeze({
          text: word.text,
          startOffset: word.startOffset,
          endOffset: word.endOffset,
          syllables: word.syllables,
          stressedSyllableIndex: word.stressedSyllableIndex,
          finalStressType: word.finalStressType,
        }),
      ),
    ),
    boundaries,
    sinalefas: Object.freeze(appliedJoins),
    doubtfulSinalefas: Object.freeze(doubtfulJoins),
    segmentation,
    ...(lastStressSyllable === undefined ? {} : { lastStress: lastStressSyllable }),
    ...(finalStressType === undefined ? {} : { finalStressType }),
    positionsToLastStress: conservativePositions,
    phoneticSyllableCount: count.phoneticSyllableCount,
    difference: conservativePositions - targetPositions,
    readings: Object.freeze(readings),
  });
}

export function createOctonolMeterValidator(
  options: OctonolMeterValidatorOptions,
): OctonolMeterValidator {
  const targetPositions = options.targetPositions ?? OCTONOL_METER_TARGET_POSITIONS;

  return Object.freeze({
    validator: OCTONOL_METER_VALIDATOR_NAME,
    version: OCTONOL_METER_VALIDATOR_VERSION,
    validate(verse: string): OctonolMeterResult {
      if (tokenizeWords(verse).length === 0) {
        return invalidResult(verse, targetPositions, "el verso no contiene palabras analizables");
      }

      const words = analyzeWords(verse, options.analyzer);

      if (!words.ok) {
        return invalidResult(
          verse,
          targetPositions,
          `una palabra del verso no se puede analizar de forma confiable: "${words.failure.form}" (${words.failure.code})`,
        );
      }

      const metricTokens = toMetricTokens(words.words);
      const detection = detectConservativeSinalefaBoundaries({
        verse,
        tokens: metricTokens,
      });
      const boundaries = Object.freeze(detection.boundaries.map(toBoundaryView));

      return analyzeResult(verse, targetPositions, words.words, boundaries);
    },
  });
}

export function toOctonolMeterDiagnostic(
  result: OctonolMeterResult,
): ValidatorDiagnosticInput {
  return Object.freeze({
    validator: result.validator,
    version: result.version,
    result: result.verdict,
    evidence: Object.freeze({
      pointer: `octonol-meter:${result.verse}`,
      ...(result.segmentation === undefined ? {} : { summary: result.segmentation }),
      excerpt: result.verse,
    }),
  });
}

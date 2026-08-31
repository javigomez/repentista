export const BATCH_DUPLICATE_DETECTOR_NAME = "batch-duplicate-detection";
export const BATCH_DUPLICATE_DETECTOR_VERSION = "batch-duplicate-detector/0.1.0";
export const BATCH_DUPLICATE_CANONICALIZATION_VERSION =
  "batch-duplicate-canonicalization/0.1.0";

/**
 * Sentence-level punctuation that carries no dedup meaning and is replaced by
 * whitespace before collapsing. Accents, dieresis and "ñ" are letters (or
 * combining marks) and are therefore preserved. The hyphen family is treated
 * as a word separator so that "bien-vestido" and "bien vestido" are equivalent.
 */
const NON_SIGNIFICANT_PUNCTUATION = /[.,;:!?¡¿"“”‘’'«»()[\]{}…—–\-]/g;

export interface BatchDuplicateCandidateInput {
  readonly id: string;
  readonly verses: readonly string[];
  readonly finalWords: readonly string[];
  readonly rhymeScheme: string;
  readonly metricPositions: number;
  readonly semanticAnchors: readonly string[];
}

export interface NormalizedCandidateIdentity {
  readonly verses: readonly string[];
  readonly finalWords: readonly string[];
  readonly semanticAnchors: readonly string[];
  readonly rhymeScheme: string;
  readonly metricPositions: number;
}

export type DuplicateClassification = "CANONICO" | "DUPLICADO";

export interface BatchDuplicateMarker {
  readonly candidateId: string;
  readonly signature: string;
  readonly classification: DuplicateClassification;
  readonly canonicalId?: string;
  readonly normalizedVerses: readonly string[];
  readonly normalizedFinalWords: readonly string[];
  readonly normalizedSemanticAnchors: readonly string[];
  readonly rhymeScheme: string;
  readonly metricPositions: number;
}

export interface BatchDuplicateGroup {
  readonly signature: string;
  readonly canonicalId: string;
  readonly memberIds: readonly string[];
  readonly size: number;
}

export interface BatchDuplicateDetectionResult {
  readonly name: string;
  readonly version: string;
  readonly canonicalizationVersion: string;
  readonly totalCandidates: number;
  readonly groupCount: number;
  readonly survivorCount: number;
  readonly groups: readonly BatchDuplicateGroup[];
  readonly markers: readonly BatchDuplicateMarker[];
}

export interface BatchDuplicateDetector {
  readonly name: string;
  readonly version: string;
  readonly canonicalizationVersion: string;
  detect(candidates: readonly BatchDuplicateCandidateInput[]): BatchDuplicateDetectionResult;
}

/**
 * Pure, versioned text normalization. Lowercases, composes combining marks,
 * replaces non-significant punctuation with whitespace and collapses any run
 * of whitespace to a single space, preserving words and their order.
 */
export function normalizeDedupText(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(NON_SIGNIFICANT_PUNCTUATION, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

export function normalizeCandidateIdentity(
  candidate: BatchDuplicateCandidateInput,
): NormalizedCandidateIdentity {
  return Object.freeze({
    verses: Object.freeze(candidate.verses.map(normalizeDedupText)),
    finalWords: Object.freeze(candidate.finalWords.map(normalizeDedupText)),
    semanticAnchors: Object.freeze(candidate.semanticAnchors.map(normalizeDedupText)),
    rhymeScheme: candidate.rhymeScheme,
    metricPositions: candidate.metricPositions,
  });
}

export function buildCandidateSignature(
  identity: NormalizedCandidateIdentity,
  canonicalizationVersion: string,
): string {
  return JSON.stringify({
    canonicalizationVersion,
    verses: identity.verses,
    finalWords: identity.finalWords,
    semanticAnchors: identity.semanticAnchors,
    rhymeScheme: identity.rhymeScheme,
    metricPositions: identity.metricPositions,
  });
}

const freezeMarker = (marker: BatchDuplicateMarker): BatchDuplicateMarker =>
  Object.freeze({
    candidateId: marker.candidateId,
    signature: marker.signature,
    classification: marker.classification,
    ...(marker.canonicalId === undefined ? {} : { canonicalId: marker.canonicalId }),
    normalizedVerses: Object.freeze(marker.normalizedVerses),
    normalizedFinalWords: Object.freeze(marker.normalizedFinalWords),
    normalizedSemanticAnchors: Object.freeze(marker.normalizedSemanticAnchors),
    rhymeScheme: marker.rhymeScheme,
    metricPositions: marker.metricPositions,
  });

const freezeGroup = (group: BatchDuplicateGroup): BatchDuplicateGroup =>
  Object.freeze({
    signature: group.signature,
    canonicalId: group.canonicalId,
    memberIds: Object.freeze([...group.memberIds]),
    size: group.size,
  });

export function createBatchDuplicateDetector(): BatchDuplicateDetector {
  return Object.freeze({
    name: BATCH_DUPLICATE_DETECTOR_NAME,
    version: BATCH_DUPLICATE_DETECTOR_VERSION,
    canonicalizationVersion: BATCH_DUPLICATE_CANONICALIZATION_VERSION,
    detect(candidates: readonly BatchDuplicateCandidateInput[]): BatchDuplicateDetectionResult {
      const firstIndexBySignature = new Map<string, number>();
      const memberIdsBySignature = new Map<string, string[]>();
      const markers: BatchDuplicateMarker[] = [];

      candidates.forEach((candidate, index) => {
        const identity = normalizeCandidateIdentity(candidate);
        const signature = buildCandidateSignature(
          identity,
          BATCH_DUPLICATE_CANONICALIZATION_VERSION,
        );

        const firstIndex = firstIndexBySignature.get(signature);
        const isCanonical = firstIndex === undefined;
        const canonicalId = isCanonical ? undefined : candidates[firstIndex]?.id;

        if (isCanonical) {
          firstIndexBySignature.set(signature, index);
          memberIdsBySignature.set(signature, [candidate.id]);
        } else {
          memberIdsBySignature.get(signature)?.push(candidate.id);
        }

        markers.push(
          freezeMarker({
            candidateId: candidate.id,
            signature,
            classification: isCanonical ? "CANONICO" : "DUPLICADO",
            canonicalId,
            normalizedVerses: identity.verses,
            normalizedFinalWords: identity.finalWords,
            normalizedSemanticAnchors: identity.semanticAnchors,
            rhymeScheme: identity.rhymeScheme,
            metricPositions: identity.metricPositions,
          }),
        );
      });

      const groups: BatchDuplicateGroup[] = [];

      for (const [signature, memberIds] of memberIdsBySignature) {
        const canonicalId = memberIds[0];
        if (canonicalId === undefined) continue;

        groups.push(
          freezeGroup({
            signature,
            canonicalId,
            memberIds,
            size: memberIds.length,
          }),
        );
      }

      return Object.freeze({
        name: BATCH_DUPLICATE_DETECTOR_NAME,
        version: BATCH_DUPLICATE_DETECTOR_VERSION,
        canonicalizationVersion: BATCH_DUPLICATE_CANONICALIZATION_VERSION,
        totalCandidates: candidates.length,
        groupCount: groups.length,
        survivorCount: groups.length,
        groups: Object.freeze(groups),
        markers: Object.freeze(markers),
      });
    },
  });
}

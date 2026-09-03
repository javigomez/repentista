import type {
  StructuredLlmGenerationError,
  StructuredLlmGenerationPort,
  StructuredLlmLimits,
  StructuredLlmOutputSchema,
  StructuredLlmPrompt,
  StructuredLlmSchemaValidationResult,
  StructuredLlmValidationIssue,
} from "../../ports/structured-llm-generation/index.js";

export const BATCH_ORIGINALITY_EVALUATOR_NAME = "batch-originality-assessment";
export const BATCH_ORIGINALITY_EVALUATOR_VERSION = "batch-originality-assessment/0.1.0";
export const BATCH_ORIGINALITY_RUBRIC_VERSION = "0.1.0";
export const BATCH_ORIGINALITY_SCOPE = "BATCH_ONLY" as const;
export const BATCH_ORIGINALITY_NOTE_MINIMUM = 0;
export const BATCH_ORIGINALITY_NOTE_MAXIMUM = 20;

export const BATCH_ORIGINALITY_RUBRIC_PROMPT: StructuredLlmPrompt = Object.freeze({
  id: "batch-originality-rubric",
  version: BATCH_ORIGINALITY_RUBRIC_VERSION,
  messages: Object.freeze([
    Object.freeze({
      role: "system",
      content:
        "Eres un crítico editorial de originalidad relativa dentro de un lote. Comparas candidatos que ya comparten plan semántico, anclas y palabras finales para decidir si su redacción es una variación superficial del mismo chiste o una ejecución genuinamente distinta. La originalidad se mide solo contra el lote actual: nunca afirmes novedad global ni plagio externo.",
    }),
    Object.freeze({
      role: "user",
      content:
        "Recibes candidatos que comparten rasgos estructurados (anclas y pareja de rima). Para cada par con redacción casi idéntica, devuelve una relación con sourceId, targetId, similarity (0 a 1) y sharedFeatures (imagen, personajes, mecanismo de remate o sintaxis compartidos). Si dos candidatos son ejecuciones realmente distintas, no devuelvas relación entre ellos. Devuelve exclusivamente el objeto JSON con el campo relationships.",
    }),
  ]),
});

export interface BatchOriginalityCandidateInput {
  readonly id: string;
  readonly verses: readonly string[];
  readonly finalWords: readonly string[];
  readonly rhymeScheme: string;
  readonly metricPositions: number;
  readonly semanticAnchors: readonly string[];
}

export interface CandidateStructuredFeatures {
  readonly rhymePair: readonly string[];
  readonly semanticAnchors: readonly string[];
  readonly rhymeScheme: string;
  readonly metricPositions: number;
}

export interface SimilarCandidateReference {
  readonly candidateId: string;
  readonly sharedFeatures: readonly string[];
}

export interface CandidateOriginalityAssessment {
  readonly candidateId: string;
  readonly note: number;
  readonly distinctiveFeatures: readonly string[];
  readonly similarCandidates: readonly SimilarCandidateReference[];
}

export interface BatchOriginalityReport {
  readonly batchId: string;
  readonly scope: typeof BATCH_ORIGINALITY_SCOPE;
  readonly evaluatorName: string;
  readonly evaluatorVersion: string;
  readonly rubricVersion: string;
  readonly totalCandidates: number;
  readonly results: readonly CandidateOriginalityAssessment[];
}

export interface BatchOriginalityRequest {
  readonly batchId: string;
  readonly candidates: readonly BatchOriginalityCandidateInput[];
  readonly generator: StructuredLlmGenerationPort;
  readonly limits: StructuredLlmLimits;
}

export type CandidateFeatureField = "verses" | "finalWords" | "semanticAnchors";

export type BatchOriginalityFailure =
  | {
      readonly code: "INVALID_BATCH_ID";
      readonly message: string;
    }
  | {
      readonly code: "DUPLICATE_CANDIDATE_ID";
      readonly message: string;
      readonly candidateId: string;
    }
  | {
      readonly code: "INCOMPLETE_CANDIDATE";
      readonly message: string;
      readonly candidateId: string;
      readonly field: CandidateFeatureField;
      readonly expected: number;
      readonly received: number;
    }
  | {
      readonly code: "LLM_ASSESSMENT_FAILED";
      readonly message: string;
      readonly cause: StructuredLlmGenerationError;
    }
  | {
      readonly code: "RELATIONSHIP_REFERENCES_UNKNOWN_CANDIDATE";
      readonly message: string;
      readonly candidateId: string;
    };

export type BatchOriginalityResult =
  | { readonly ok: true; readonly value: BatchOriginalityReport }
  | { readonly ok: false; readonly error: BatchOriginalityFailure };

interface OriginalityLlmRelationship {
  readonly sourceId: string;
  readonly targetId: string;
  readonly similarity: number;
  readonly sharedFeatures: readonly string[];
}

interface OriginalityLlmOutput {
  readonly relationships: readonly OriginalityLlmRelationship[];
}

const VERSE_SLOT_COUNT = 4;

const normalizeFeatureText = (value: string): string =>
  value.normalize("NFC").toLowerCase().replace(/\s+/gu, " ").trim();

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function extractStructuredFeatures(
  candidate: BatchOriginalityCandidateInput,
): CandidateStructuredFeatures {
  const normalizedFinalWords = Object.freeze(
    candidate.finalWords.map(normalizeFeatureText),
  );

  return Object.freeze({
    rhymePair: Object.freeze([normalizedFinalWords[1] ?? "", normalizedFinalWords[3] ?? ""]),
    semanticAnchors: Object.freeze(candidate.semanticAnchors.map(normalizeFeatureText)),
    rhymeScheme: candidate.rhymeScheme,
    metricPositions: candidate.metricPositions,
  });
}

export function buildStructuredFeatureKey(features: CandidateStructuredFeatures): string {
  return JSON.stringify({
    rhymePair: features.rhymePair,
    semanticAnchors: features.semanticAnchors,
    rhymeScheme: features.rhymeScheme,
    metricPositions: features.metricPositions,
  });
}

const originalityOutputSchema: StructuredLlmOutputSchema<OriginalityLlmOutput> =
  Object.freeze({
    name: "batch-originality-assessment",
    version: "0.1.0",
    validate(value: unknown): StructuredLlmSchemaValidationResult<OriginalityLlmOutput> {
      if (!isRecord(value)) {
        return {
          ok: false as const,
          issues: Object.freeze([{ path: "$", message: "Expected an object." }]),
        };
      }

      const issues: StructuredLlmValidationIssue[] = [];

      for (const field of Object.keys(value)) {
        if (field !== "relationships") {
          issues.push({ path: `$.${field}`, message: "Unexpected field." });
        }
      }

      const relationships: OriginalityLlmRelationship[] = [];

      if (!Array.isArray(value.relationships)) {
        issues.push({ path: "$.relationships", message: "Expected an array." });
      } else {
        value.relationships.forEach((item, index) => {
          const basePath = `$.relationships[${index}]`;

          if (!isRecord(item)) {
            issues.push({ path: basePath, message: "Expected an object." });
            return;
          }

          const sourceId = typeof item.sourceId === "string" ? item.sourceId.trim() : "";
          const targetId = typeof item.targetId === "string" ? item.targetId.trim() : "";

          if (sourceId.length === 0) {
            issues.push({ path: `${basePath}.sourceId`, message: "Expected a non-empty id." });
          }

          if (targetId.length === 0) {
            issues.push({ path: `${basePath}.targetId`, message: "Expected a non-empty id." });
          }

          if (sourceId.length > 0 && sourceId === targetId) {
            issues.push({
              path: `${basePath}.targetId`,
              message: "A candidate cannot be similar to itself.",
            });
          }

          const similarity = item.similarity;
          const similarityIsValid =
            typeof similarity === "number" &&
            Number.isFinite(similarity) &&
            similarity >= 0 &&
            similarity <= 1;

          if (!similarityIsValid) {
            issues.push({
              path: `${basePath}.similarity`,
              message: "Expected a number between 0 and 1.",
            });
          }

          const sharedFeatures: string[] = [];

          if (!Array.isArray(item.sharedFeatures)) {
            issues.push({
              path: `${basePath}.sharedFeatures`,
              message: "Expected an array.",
            });
          } else {
            item.sharedFeatures.forEach((feature, featureIndex) => {
              const featurePath = `${basePath}.sharedFeatures[${featureIndex}]`;

              if (typeof feature !== "string" || feature.trim().length === 0) {
                issues.push({
                  path: featurePath,
                  message: "Expected a non-empty string.",
                });
              } else {
                sharedFeatures.push(feature.trim());
              }
            });
          }

          if (
            sourceId.length > 0 &&
            sourceId !== targetId &&
            similarityIsValid &&
            Array.isArray(item.sharedFeatures) &&
            item.sharedFeatures.every(
              (feature: unknown) => typeof feature === "string" && feature.trim().length > 0,
            )
          ) {
            relationships.push(
              Object.freeze({
                sourceId,
                targetId,
                similarity: similarity as number,
                sharedFeatures: Object.freeze(sharedFeatures),
              }),
            );
          }
        });
      }

      if (issues.length > 0) {
        return { ok: false as const, issues: Object.freeze(issues) };
      }

      return {
        ok: true as const,
        value: Object.freeze({ relationships: Object.freeze(relationships) }),
      };
    },
  });

const describeDistinctiveFeatures = (features: CandidateStructuredFeatures): readonly string[] =>
  Object.freeze([
    `pareja de rima: ${features.rhymePair[0]}-${features.rhymePair[1]}`,
    ...features.semanticAnchors,
  ]);

const invalidBatchId = (): BatchOriginalityFailure =>
  Object.freeze({
    code: "INVALID_BATCH_ID" as const,
    message: "La evaluación de originalidad requiere un identificador de lote.",
  });

const duplicateCandidateId = (candidateId: string): BatchOriginalityFailure =>
  Object.freeze({
    code: "DUPLICATE_CANDIDATE_ID" as const,
    message: `El lote contiene candidatos con el identificador duplicado ${candidateId}.`,
    candidateId,
  });

const incompleteCandidate = (
  candidateId: string,
  field: CandidateFeatureField,
  received: number,
): BatchOriginalityFailure =>
  Object.freeze({
    code: "INCOMPLETE_CANDIDATE" as const,
    message: `El candidato ${candidateId} debe aportar exactamente ${VERSE_SLOT_COUNT} elementos en ${field}.`,
    candidateId,
    field,
    expected: VERSE_SLOT_COUNT,
    received,
  });

const llmAssessmentFailed = (cause: StructuredLlmGenerationError): BatchOriginalityFailure =>
  Object.freeze({
    code: "LLM_ASSESSMENT_FAILED" as const,
    message: "El LLM no pudo producir una comparación de originalidad conforme al esquema.",
    cause,
  });

const unknownCandidateReference = (candidateId: string): BatchOriginalityFailure =>
  Object.freeze({
    code: "RELATIONSHIP_REFERENCES_UNKNOWN_CANDIDATE" as const,
    message: `La comparación referencia al candidato desconocido ${candidateId}.`,
    candidateId,
  });

const validateRequest = (
  request: BatchOriginalityRequest,
): BatchOriginalityFailure | undefined => {
  if (request.batchId.trim().length === 0) {
    return invalidBatchId();
  }

  const seenIds = new Set<string>();

  for (const candidate of request.candidates) {
    if (seenIds.has(candidate.id)) {
      return duplicateCandidateId(candidate.id);
    }
    seenIds.add(candidate.id);

    if (candidate.verses.length !== VERSE_SLOT_COUNT) {
      return incompleteCandidate(candidate.id, "verses", candidate.verses.length);
    }
    if (candidate.finalWords.length !== VERSE_SLOT_COUNT) {
      return incompleteCandidate(candidate.id, "finalWords", candidate.finalWords.length);
    }
    if (candidate.semanticAnchors.length !== VERSE_SLOT_COUNT) {
      return incompleteCandidate(
        candidate.id,
        "semanticAnchors",
        candidate.semanticAnchors.length,
      );
    }
  }

  return undefined;
};

export async function assessBatchOriginality(
  request: BatchOriginalityRequest,
): Promise<BatchOriginalityResult> {
  const validationError = validateRequest(request);

  if (validationError !== undefined) {
    return Object.freeze({ ok: false as const, error: validationError });
  }

  const candidateById = new Map<string, BatchOriginalityCandidateInput>();
  const featuresByCandidateId = new Map<string, CandidateStructuredFeatures>();
  const bucketIdsByKey = new Map<string, string[]>();

  for (const candidate of request.candidates) {
    candidateById.set(candidate.id, candidate);
    const features = extractStructuredFeatures(candidate);
    featuresByCandidateId.set(candidate.id, features);

    const key = buildStructuredFeatureKey(features);
    const bucketIds = bucketIdsByKey.get(key) ?? [];
    bucketIds.push(candidate.id);
    bucketIdsByKey.set(key, bucketIds);
  }

  const relationships: OriginalityLlmRelationship[] = [];

  for (const bucketIds of bucketIdsByKey.values()) {
    if (bucketIds.length < 2) {
      continue;
    }

    const bucketIdSet = new Set(bucketIds);
    const bucketCandidates = bucketIds.map((id) => {
      const candidate = candidateById.get(id);

      if (candidate === undefined) {
        throw new Error(`Candidate ${id} disappeared while assessing originality.`);
      }

      return Object.freeze({ id: candidate.id, verses: candidate.verses });
    });

    const generation = await request.generator.generate({
      operation: "assess-batch-originality",
      prompt: BATCH_ORIGINALITY_RUBRIC_PROMPT,
      input: Object.freeze({
        batchId: request.batchId,
        candidates: Object.freeze(bucketCandidates),
      }),
      outputSchema: originalityOutputSchema,
      limits: request.limits,
    });

    if (!generation.ok) {
      return Object.freeze({ ok: false as const, error: llmAssessmentFailed(generation.error) });
    }

    for (const relationship of generation.value.data.relationships) {
      if (!bucketIdSet.has(relationship.sourceId)) {
        return Object.freeze({
          ok: false as const,
          error: unknownCandidateReference(relationship.sourceId),
        });
      }

      if (!bucketIdSet.has(relationship.targetId)) {
        return Object.freeze({
          ok: false as const,
          error: unknownCandidateReference(relationship.targetId),
        });
      }

      relationships.push(relationship);
    }
  }

  const maxSimilarityByCandidateId = new Map<string, number>();
  const referencesByCandidateId = new Map<string, Map<string, SimilarCandidateReference>>();

  for (const relationship of relationships) {
    const previousSource = maxSimilarityByCandidateId.get(relationship.sourceId) ?? 0;
    maxSimilarityByCandidateId.set(
      relationship.sourceId,
      Math.max(previousSource, relationship.similarity),
    );

    const previousTarget = maxSimilarityByCandidateId.get(relationship.targetId) ?? 0;
    maxSimilarityByCandidateId.set(
      relationship.targetId,
      Math.max(previousTarget, relationship.similarity),
    );

    const sourceReferences = referencesByCandidateId.get(relationship.sourceId) ?? new Map();
    sourceReferences.set(
      relationship.targetId,
      Object.freeze({
        candidateId: relationship.targetId,
        sharedFeatures: relationship.sharedFeatures,
      }),
    );
    referencesByCandidateId.set(relationship.sourceId, sourceReferences);

    const targetReferences = referencesByCandidateId.get(relationship.targetId) ?? new Map();
    targetReferences.set(
      relationship.sourceId,
      Object.freeze({
        candidateId: relationship.sourceId,
        sharedFeatures: relationship.sharedFeatures,
      }),
    );
    referencesByCandidateId.set(relationship.targetId, targetReferences);
  }

  const results = request.candidates.map((candidate) => {
    const features = featuresByCandidateId.get(candidate.id);
    const bucketIds = [...bucketIdsByKey.values()].find((ids) => ids.includes(candidate.id));

    if (features === undefined || bucketIds === undefined) {
      throw new Error(`Candidate ${candidate.id} lost its features during assessment.`);
    }

    const isSoleBucketMember = bucketIds.length === 1;
    const maxSimilarity = maxSimilarityByCandidateId.get(candidate.id) ?? 0;
    const note = Math.round(
      BATCH_ORIGINALITY_NOTE_MAXIMUM * (1 - maxSimilarity),
    );

    const references = referencesByCandidateId.get(candidate.id);

    return Object.freeze({
      candidateId: candidate.id,
      note,
      distinctiveFeatures: isSoleBucketMember
        ? describeDistinctiveFeatures(features)
        : Object.freeze([]),
      similarCandidates: Object.freeze(
        references === undefined
          ? []
          : [...references.values()].sort((left, right) =>
              left.candidateId.localeCompare(right.candidateId),
            ),
      ),
    });
  });

  return Object.freeze({
    ok: true as const,
    value: Object.freeze({
      batchId: request.batchId,
      scope: BATCH_ORIGINALITY_SCOPE,
      evaluatorName: BATCH_ORIGINALITY_EVALUATOR_NAME,
      evaluatorVersion: BATCH_ORIGINALITY_EVALUATOR_VERSION,
      rubricVersion: BATCH_ORIGINALITY_RUBRIC_VERSION,
      totalCandidates: request.candidates.length,
      results: Object.freeze(results),
    }),
  });
}

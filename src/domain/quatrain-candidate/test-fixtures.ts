import assert from "node:assert/strict";

import {
  createGenerationBrief,
  type GenerationBrief,
} from "../generation-brief/index.js";
import {
  createQuatrainCandidate,
  transitionQuatrainCandidate,
  type CandidateLifecycleTransitionInput,
  type CandidatePlanInput,
  type CandidateProvenanceInput,
  type CandidateRepairInput,
  type CoherenceAssessmentRecord,
  type NaturalnessAssessmentRecord,
  type VocabularySuitabilityAssessmentRecord,
  type HumorAssessmentRecord,
  type RipioDetectionRecord,
  type RipioSeverity,
  type PunchlineAssessmentRecord,
  type QuatrainCandidate,
  type QuatrainCandidateInput,
  type VerseSlot,
} from "./index.js";
import { fixedClock, sequenceDouble } from "../../testing/test-doubles.js";

export const CREATED_AT = "2026-08-30T09:15:00.000Z";
export const VALIDATION_STARTED_AT = "2026-08-30T09:16:00.000Z";
const VALIDATION_COMPLETED_AT = "2026-08-30T09:17:00.000Z";
const SCORED_AT = "2026-08-30T09:18:00.000Z";
const SELECTED_AT = "2026-08-30T09:19:00.000Z";
const EDITORIAL_AT = "2026-08-30T09:20:00.000Z";
const EXPORTED_AT = "2026-08-30T09:21:00.000Z";

export function validBrief(): GenerationBrief {
  const result = createGenerationBrief({
    context: "Un gato promete compartir la merienda",
    tone: "absurdo y cercano",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected valid brief fixture");
  }

  return result.value;
}

export function completePlan(overrides: Partial<CandidatePlanInput> = {}): CandidatePlanInput {
  return {
    rhymeScheme: "0-A-0-A",
    metricPositions: 7,
    slots: [
      {
        slot: "V1",
        role: "PRESENTACION",
        semanticAnchor: "presenta al gato y la merienda",
        plannedFinalWord: "vecino",
      },
      {
        slot: "V2",
        role: "PREPARACION",
        semanticAnchor: "promete guardar pan para otro",
        plannedFinalWord: "melón",
      },
      {
        slot: "V3",
        role: "GIRO_TENSION",
        semanticAnchor: "se distrae con hambre repentina",
        plannedFinalWord: "camino",
      },
      {
        slot: "V4",
        role: "REMATE",
        semanticAnchor: "confiesa que compartió solo el olor",
        plannedFinalWord: "jamón",
      },
    ],
    ...overrides,
  };
}

export function provenance(overrides: Partial<CandidateProvenanceInput> = {}): CandidateProvenanceInput {
  return {
    createdAt: CREATED_AT,
    generator: {
      name: "QuatrainGenerator",
      version: "0.1.0",
    },
    prompt: {
      id: "writer-from-punchline",
      version: "prompt-0.1.0",
    },
    model: {
      provider: "openai",
      name: "gpt-5",
      version: "2026-08-30",
    },
    ...overrides,
  };
}

export function candidateInput(overrides: Partial<QuatrainCandidateInput> = {}): QuatrainCandidateInput {
  return {
    id: "candidate-001",
    batchId: "batch-001",
    brief: validBrief(),
    plan: completePlan(),
    provenance: provenance(),
    ...overrides,
  };
}

export function candidateFactoryInput() {
  const { createdAt: _createdAt, ...provenanceWithoutCreatedAt } = provenance();

  return {
    batchId: "batch-001",
    brief: validBrief(),
    plan: completePlan(),
    provenance: provenanceWithoutCreatedAt,
  };
}

export function createdCandidate(): QuatrainCandidate {
  const result = createQuatrainCandidate(candidateInput());

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected valid candidate fixture");
  }

  return result.value;
}

export function punchlineAssessment(
  overrides: Partial<PunchlineAssessmentRecord> = {},
): PunchlineAssessmentRecord {
  return {
    note: 9,
    confidence: 0.9,
    expectation: "V1–V3 construyen la promesa de compartir la merienda",
    expectationEvidence: ["promete compartir la merienda"],
    resolution: "V4 convierte la promesa en un giro: solo comparte el olor",
    resolutionEvidence: "solo el olor del jamón",
    twistDegree: "MODERADO",
    contextDependency: "TOTAL",
    rubricVersion: "0.1.0",
    prompt: { id: "punchline-rubric", version: "0.1.0" },
    model: { provider: "openai", name: "gpt-5" },
    assessedAt: "2026-08-30T09:18:30.000Z",
    providerRequestId: "req-punchline-001",
    ...overrides,
  };
}

export function coherenceAssessment(
  overrides: Partial<CoherenceAssessmentRecord> = {},
): CoherenceAssessmentRecord {
  return {
    note: 13,
    confidence: 0.9,
    transitions: [
      {
        from: "V1",
        to: "V2",
        relation: "continuidad de referente",
        evidence: "el gato sigue siendo el sujeto",
      },
      {
        from: "V2",
        to: "V3",
        relation: "causalidad",
        evidence: "el hambre explica la distracción",
      },
      {
        from: "V3",
        to: "V4",
        relation: "progresión al remate",
        evidence: "la distracción desemboca en el remate",
      },
    ],
    rubricVersion: "0.1.0",
    prompt: { id: "coherence-rubric", version: "0.1.0" },
    model: { provider: "openai", name: "gpt-5" },
    assessedAt: "2026-08-30T09:18:30.000Z",
    providerRequestId: "req-coherence-001",
    ...overrides,
  };
}

export function naturalnessAssessment(
  overrides: Partial<NaturalnessAssessmentRecord> = {},
): NaturalnessAssessmentRecord {
  return {
    note: 18,
    confidence: 0.9,
    observations: [
      { slot: "V3", fragment: "se distrae", reason: "giro forzado" },
    ],
    rubricVersion: "0.1.0",
    prompt: { id: "naturalness-rubric", version: "0.1.0" },
    model: { provider: "openai", name: "gpt-5" },
    assessedAt: "2026-08-30T09:18:30.000Z",
    providerRequestId: "req-naturalness-001",
    ...overrides,
  };
}


export function humorAssessment(
  overrides: Partial<HumorAssessmentRecord> = {},
): HumorAssessmentRecord {
  return {
    note: 9,
    confidence: 0.9,
    mechanism: "SORPRESA",
    clarity: "CLARA",
    fragments: [
      {
        slot: "V4",
        fragment: "solo el olor del jamón",
        reason: "La promesa de compartir se resuelve compartiendo solo el olor.",
      },
    ],
    rubricVersion: "0.1.0",
    prompt: { id: "humor-rubric", version: "0.1.0" },
    model: { provider: "openai", name: "gpt-5" },
    assessedAt: "2026-08-30T09:18:30.000Z",
    providerRequestId: "req-humor-001",
    ...overrides,
  };
}

export function vocabularySuitabilityAssessment(
  overrides: Partial<VocabularySuitabilityAssessmentRecord> = {},
): VocabularySuitabilityAssessmentRecord {
  return {
    note: 8,
    confidence: 0.9,
    wordMetadata: [
      {
        slot: "V4",
        form: "balcón",
        normalizedForm: "balcon",
        dictionaryLevel: "basico",
      },
    ],
    flaggedWords: [],
    dictionaryVersion: "dictionary-2026-08-30",
    rubricVersion: "0.1.0",
    prompt: { id: "vocabulary-suitability-rubric", version: "0.1.0" },
    model: { provider: "openai", name: "gpt-5" },
    assessedAt: "2026-08-30T09:22:00.000Z",
    providerRequestId: "req-vocab-001",
    ...overrides,
  };
}

export function validScoreTransition(): CandidateLifecycleTransitionInput {
  return {
    type: "SCORE_RECORDED",
    at: SCORED_AT,
    rubricVersion: "rubric-0.1.0",
    score: 86,
    breakdown: [
      { dimension: "Metrica", points: 20, maximum: 20 },
      { dimension: "Rima", points: 20, maximum: 20 },
      { dimension: "Naturalidad", points: 18, maximum: 20 },
      { dimension: "Coherencia", points: 14, maximum: 15 },
      { dimension: "Remate", points: 9, maximum: 10 },
      { dimension: "Humor", points: 3, maximum: 5 },
      { dimension: "Vocabulario", points: 2, maximum: 5 },
      { dimension: "Originalidad", points: 0, maximum: 5 },
    ],
    explanation: "Cumple bloqueos duros y tiene un remate claro.",
  };
}

export function validationRequestedTransition(): CandidateLifecycleTransitionInput {
  return {
    type: "VALIDATION_REQUESTED",
    at: VALIDATION_STARTED_AT,
    validators: [
      { name: "metric", version: "metric-0.1.0" },
      { name: "rhyme", version: "rhyme-0.1.0" },
      { name: "lexicon", version: "lexicon-0.1.0" },
    ],
  };
}

export function hardValidationPassedTransition(): CandidateLifecycleTransitionInput {
  return {
    type: "HARD_VALIDATION_PASSED",
    at: VALIDATION_COMPLETED_AT,
    diagnostics: [
      {
        validator: "metric",
        version: "metric-0.1.0",
        result: "VALIDO",
        evidence: { pointer: "/validation/metric", summary: "4 versos con 7 posiciones" },
      },
      {
        validator: "rhyme",
        version: "rhyme-0.1.0",
        result: "VALIDO",
        evidence: { pointer: "/validation/rhyme", summary: "V2 y V4 comparten A" },
      },
    ],
  };
}

export function hardValidationRejectedTransition(): CandidateLifecycleTransitionInput {
  return {
    type: "HARD_VALIDATION_REJECTED",
    at: VALIDATION_COMPLETED_AT,
    rejection: {
      validator: "metric",
      version: "metric-0.1.0",
      reason: "V3 requiere hiato artificial para llegar a siete posiciones.",
      evidence: {
        pointer: "/validation/metric/V3",
        excerpt: "se distrae con hambre repentina",
      },
    },
  };
}

export function thresholdFailedTransition(): CandidateLifecycleTransitionInput {
  return {
    type: "THRESHOLD_FAILED",
    at: SELECTED_AT,
    threshold: 80,
    score: 74,
    reason: "No alcanza el umbral editorial configurado.",
  };
}

export function finalistSelectedTransition(): CandidateLifecycleTransitionInput {
  return {
    type: "FINALIST_SELECTED",
    at: SELECTED_AT,
    rank: 1,
    selectedBy: "batch-ranking",
  };
}

export function editorialApprovedTransition(): CandidateLifecycleTransitionInput {
  return {
    type: "EDITORIAL_APPROVED",
    at: EDITORIAL_AT,
    editor: "qa-editor",
    reason: "Apto para exportacion tras revision humana.",
  };
}

export function editorialRejectedTransition(): CandidateLifecycleTransitionInput {
  return {
    type: "EDITORIAL_REJECTED",
    at: EDITORIAL_AT,
    editor: "qa-editor",
    reason: "El remate es claro pero poco natural.",
  };
}

export function exportedTransition(): CandidateLifecycleTransitionInput {
  return {
    type: "EXPORTED",
    at: EXPORTED_AT,
    packageId: "content-2026.08.30.1",
    contractVersion: "challenge-contract-0.1.0",
  };
}

export function applyTransition(
  candidate: QuatrainCandidate,
  transition: CandidateLifecycleTransitionInput,
): QuatrainCandidate {
  const result = transitionQuatrainCandidate(candidate, transition);

  assert.equal(result.ok, true, `Expected ${transition.type} to be accepted`);
  if (!result.ok) {
    throw new Error(`Expected transition ${transition.type} to succeed`);
  }

  return result.value;
}

export function candidateInState(state: QuatrainCandidate["state"]): QuatrainCandidate {
  let candidate = createdCandidate();

  if (state === "GENERADO") return candidate;

  candidate = applyTransition(candidate, validationRequestedTransition());
  if (state === "VALIDACION_PENDIENTE") return candidate;

  if (state === "RECHAZADO") {
    return applyTransition(candidate, hardValidationRejectedTransition());
  }

  candidate = applyTransition(candidate, hardValidationPassedTransition());
  if (state === "VALIDO") return candidate;

  candidate = applyTransition(candidate, validScoreTransition());
  if (state === "PUNTUADO") return candidate;

  if (state === "BAJO_UMBRAL") {
    return applyTransition(candidate, thresholdFailedTransition());
  }

  candidate = applyTransition(candidate, finalistSelectedTransition());
  if (state === "SELECCIONADO") return candidate;

  if (state === "RECHAZADO_EDITORIAL") {
    return applyTransition(candidate, editorialRejectedTransition());
  }

  candidate = applyTransition(candidate, editorialApprovedTransition());
  if (state === "APROBADO") return candidate;

  if (state === "EXPORTADO") {
    return applyTransition(candidate, exportedTransition());
  }

  const exhaustive: never = state;
  throw new Error(`Unsupported candidate state fixture: ${exhaustive}`);
}

export function ripioDetection(
  overrides: Partial<RipioDetectionRecord> = {},
): RipioDetectionRecord {
  return {
    presence: true,
    severity: "LEVE",
    fragments: [
      { slot: "V3", fragment: "es que", reason: "muletilla de relleno" },
    ],
    signals: [
      {
        patternId: "ripio.filler",
        patternVersion: "0.1.0",
        slot: "V3",
        fragment: "es que",
        severity: "LEVE",
        reason: "muletilla de relleno",
      },
    ],
    llm: {
      severity: "NINGUNO",
      confidence: 0.9,
      fragments: [],
      explanation: "No se aprecia ripio adicional.",
    },
    rubricVersion: "0.1.0",
    prompt: { id: "ripio-detection-rubric", version: "0.1.0" },
    model: { provider: "openai", name: "gpt-5" },
    assessedAt: "2026-08-30T09:22:00.000Z",
    providerRequestId: "req-ripio-001",
    ...overrides,
  };
}

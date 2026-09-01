import test from "node:test";
import assert from "node:assert/strict";

import {
  createGenerationBrief,
  type GenerationBrief,
} from "./generation-brief/index.js";
import {
  createQuatrainCandidate,
  createQuatrainCandidateWithCollaborators,
  hasPassedHardValidation,
  recordCandidateRepair,
  recordCoherenceAssessment,
  recordNaturalnessAssessment,
  recordRipioDetection,
  toQuatrainCandidateSnapshot,
  transitionQuatrainCandidate,
  type CandidateLifecycleTransitionInput,
  type CandidatePlanInput,
  type CandidateProvenanceInput,
  type CandidateRepairInput,
  type CoherenceAssessmentRecord,
  type NaturalnessAssessmentRecord,
  type QuatrainCandidate,
  type QuatrainCandidateInput,
  type RipioDetectionRecord,
  type RipioSeverity,
  type VerseSlot,
} from "./quatrain-candidate/index.js";
import { fixedClock, sequenceDouble } from "../testing/test-doubles.js";

const CREATED_AT = "2026-08-30T09:15:00.000Z";
const VALIDATION_STARTED_AT = "2026-08-30T09:16:00.000Z";
const VALIDATION_COMPLETED_AT = "2026-08-30T09:17:00.000Z";
const SCORED_AT = "2026-08-30T09:18:00.000Z";
const SELECTED_AT = "2026-08-30T09:19:00.000Z";
const EDITORIAL_AT = "2026-08-30T09:20:00.000Z";
const EXPORTED_AT = "2026-08-30T09:21:00.000Z";

function validBrief(): GenerationBrief {
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

function completePlan(overrides: Partial<CandidatePlanInput> = {}): CandidatePlanInput {
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

function provenance(overrides: Partial<CandidateProvenanceInput> = {}): CandidateProvenanceInput {
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

function candidateInput(overrides: Partial<QuatrainCandidateInput> = {}): QuatrainCandidateInput {
  return {
    id: "candidate-001",
    batchId: "batch-001",
    brief: validBrief(),
    plan: completePlan(),
    provenance: provenance(),
    ...overrides,
  };
}

function candidateFactoryInput() {
  const { createdAt: _createdAt, ...provenanceWithoutCreatedAt } = provenance();

  return {
    batchId: "batch-001",
    brief: validBrief(),
    plan: completePlan(),
    provenance: provenanceWithoutCreatedAt,
  };
}

function createdCandidate(): QuatrainCandidate {
  const result = createQuatrainCandidate(candidateInput());

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected valid candidate fixture");
  }

  return result.value;
}

function coherenceAssessment(
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

function naturalnessAssessment(
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


function validScoreTransition(): CandidateLifecycleTransitionInput {
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

function validationRequestedTransition(): CandidateLifecycleTransitionInput {
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

function hardValidationPassedTransition(): CandidateLifecycleTransitionInput {
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

function hardValidationRejectedTransition(): CandidateLifecycleTransitionInput {
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

function thresholdFailedTransition(): CandidateLifecycleTransitionInput {
  return {
    type: "THRESHOLD_FAILED",
    at: SELECTED_AT,
    threshold: 80,
    score: 74,
    reason: "No alcanza el umbral editorial configurado.",
  };
}

function finalistSelectedTransition(): CandidateLifecycleTransitionInput {
  return {
    type: "FINALIST_SELECTED",
    at: SELECTED_AT,
    rank: 1,
    selectedBy: "batch-ranking",
  };
}

function editorialApprovedTransition(): CandidateLifecycleTransitionInput {
  return {
    type: "EDITORIAL_APPROVED",
    at: EDITORIAL_AT,
    editor: "qa-editor",
    reason: "Apto para exportacion tras revision humana.",
  };
}

function editorialRejectedTransition(): CandidateLifecycleTransitionInput {
  return {
    type: "EDITORIAL_REJECTED",
    at: EDITORIAL_AT,
    editor: "qa-editor",
    reason: "El remate es claro pero poco natural.",
  };
}

function exportedTransition(): CandidateLifecycleTransitionInput {
  return {
    type: "EXPORTED",
    at: EXPORTED_AT,
    packageId: "content-2026.08.30.1",
    contractVersion: "challenge-contract-0.1.0",
  };
}

function applyTransition(
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

function candidateInState(state: QuatrainCandidate["state"]): QuatrainCandidate {
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

test("creates a complete auditable candidate with four ordered verse slots", () => {
  const input = candidateInput();

  const result = createQuatrainCandidate(input);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.id, "candidate-001");
  assert.equal(result.value.batchId, "batch-001");
  assert.equal(result.value.state, "GENERADO");
  assert.equal(result.value.brief, input.brief);
  assert.deepEqual(
    result.value.plan.slots.map((slot) => slot.slot),
    ["V1", "V2", "V3", "V4"],
  );
  assert.deepEqual(
    result.value.plan.slots.map((slot) => slot.role),
    ["PRESENTACION", "PREPARACION", "GIRO_TENSION", "REMATE"],
  );
  assert.deepEqual(
    result.value.plan.slots.map((slot) => slot.plannedFinalWord),
    ["vecino", "melón", "camino", "jamón"],
  );
  assert.deepEqual(result.value.provenance, input.provenance);
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.plan), true);
  assert.equal(Object.isFrozen(result.value.plan.slots), true);
  assert.equal(Object.isFrozen(result.value.provenance), true);
});

test("rejects incomplete candidates and reports the missing verse slot", () => {
  const result = createQuatrainCandidate(
    candidateInput({
      plan: completePlan({
        slots: completePlan().slots.filter((slot) => slot.slot !== "V3"),
      }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  const slotError = result.errors.find((error) => error.code === "INCOMPLETE_VERSE_SLOTS");

  assert.equal(slotError?.field, "plan.slots");
  assert.deepEqual(slotError?.missingSlots, ["V3"]);
  assert.deepEqual(slotError?.receivedSlots, ["V1", "V2", "V4"]);
});

test("rejects verse roles that do not match the fixed slot contract", () => {
  const result = createQuatrainCandidate(
    candidateInput({
      plan: completePlan({
        slots: completePlan().slots.map((slot) =>
          slot.slot === "V4" ? { ...slot, role: "GIRO_TENSION" } : slot,
        ),
      }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  const roleError = result.errors.find((error) => error.code === "INVALID_VERSE_ROLE");

  assert.equal(roleError?.field, "plan.slots");
  assert.equal(roleError?.slot, "V4");
  assert.equal(roleError?.expectedRole, "REMATE");
  assert.equal(roleError?.receivedRole, "GIRO_TENSION");
});

test("accepts only declared lifecycle transitions and leaves the source candidate unchanged", () => {
  const allowedTransitions: readonly {
    readonly from: QuatrainCandidate["state"];
    readonly transition: CandidateLifecycleTransitionInput;
    readonly to: QuatrainCandidate["state"];
  }[] = [
    {
      from: "GENERADO",
      transition: validationRequestedTransition(),
      to: "VALIDACION_PENDIENTE",
    },
    {
      from: "VALIDACION_PENDIENTE",
      transition: hardValidationPassedTransition(),
      to: "VALIDO",
    },
    {
      from: "VALIDACION_PENDIENTE",
      transition: hardValidationRejectedTransition(),
      to: "RECHAZADO",
    },
    {
      from: "VALIDO",
      transition: validScoreTransition(),
      to: "PUNTUADO",
    },
    {
      from: "PUNTUADO",
      transition: thresholdFailedTransition(),
      to: "BAJO_UMBRAL",
    },
    {
      from: "PUNTUADO",
      transition: finalistSelectedTransition(),
      to: "SELECCIONADO",
    },
    {
      from: "SELECCIONADO",
      transition: editorialApprovedTransition(),
      to: "APROBADO",
    },
    {
      from: "SELECCIONADO",
      transition: editorialRejectedTransition(),
      to: "RECHAZADO_EDITORIAL",
    },
    {
      from: "APROBADO",
      transition: exportedTransition(),
      to: "EXPORTADO",
    },
  ];

  for (const scenario of allowedTransitions) {
    const candidate = candidateInState(scenario.from);
    const result = transitionQuatrainCandidate(candidate, scenario.transition);

    assert.equal(
      result.ok,
      true,
      `${scenario.from} should accept ${scenario.transition.type}`,
    );
    if (!result.ok) continue;

    assert.equal(result.value.state, scenario.to, scenario.transition.type);
    assert.equal(candidate.state, scenario.from, "transitions return a new immutable value");
    assert.equal(result.value.events.at(-1)?.type, scenario.transition.type);
    assert.equal(Object.isFrozen(result.value), true);
    assert.equal(Object.isFrozen(result.value.events), true);
  }
});

test("rejects scoring before hard validation succeeds with the current state and missing prerequisite", () => {
  const forbiddenStates: readonly QuatrainCandidate["state"][] = [
    "GENERADO",
    "VALIDACION_PENDIENTE",
    "RECHAZADO",
  ];

  for (const state of forbiddenStates) {
    const candidate = candidateInState(state);
    const result = transitionQuatrainCandidate(candidate, validScoreTransition());

    assert.equal(result.ok, false, `${state} should reject scoring`);
    if (result.ok) continue;

    assert.equal(result.error.code, "INVALID_TRANSITION");
    assert.equal(result.error.currentState, state);
    assert.equal(result.error.requestedTransition, "SCORE_RECORDED");
    assert.deepEqual(result.error.missingPrerequisites, ["VALIDO"]);
    assert.equal(candidate.state, state);
  }
});

test("keeps validator rejection evidence localizable and append-only in the event history", () => {
  const pending = candidateInState("VALIDACION_PENDIENTE");
  const result = transitionQuatrainCandidate(pending, hardValidationRejectedTransition());

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.state, "RECHAZADO");
  assert.deepEqual(result.value.rejections, [
    {
      validator: "metric",
      version: "metric-0.1.0",
      reason: "V3 requiere hiato artificial para llegar a siete posiciones.",
      evidence: {
        pointer: "/validation/metric/V3",
        excerpt: "se distrae con hambre repentina",
      },
    },
  ]);
  assert.equal(result.value.events.at(-1)?.type, "HARD_VALIDATION_REJECTED");
  assert.deepEqual(result.value.events.at(-1)?.rejection, result.value.rejections[0]);
  assert.equal(Object.isFrozen(result.value.rejections), true);
  assert.equal(Object.isFrozen(result.value.rejections[0]), true);
});

test("records repairs as immutable history without overwriting prior attempts", () => {
  const rejected = candidateInState("RECHAZADO");
  const firstRepair: CandidateRepairInput = {
    at: "2026-08-30T09:22:00.000Z",
    repairedBy: "writer-repair",
    sourceRejectionPointer: "/validation/metric/V3",
    changes: [
      {
        slot: "V3",
        before: "se distrae con hambre repentina",
        after: "se despista con su hambre",
      },
    ],
    prompt: { id: "repair-metric-verse", version: "prompt-0.1.0" },
    model: { provider: "openai", name: "gpt-5", version: "2026-08-30" },
  };
  const secondRepair: CandidateRepairInput = {
    at: "2026-08-30T09:23:00.000Z",
    repairedBy: "writer-repair",
    sourceRejectionPointer: "/validation/metric/V3",
    changes: [
      {
        slot: "V3",
        before: "se despista con su hambre",
        after: "se queda con hambre y tino",
      },
    ],
    prompt: { id: "repair-metric-verse", version: "prompt-0.1.1" },
    model: { provider: "openai", name: "gpt-5", version: "2026-08-30" },
  };

  const repairedOnce = recordCandidateRepair(rejected, firstRepair);

  assert.equal(repairedOnce.ok, true);
  if (!repairedOnce.ok) return;

  const repairedTwice = recordCandidateRepair(repairedOnce.value, secondRepair);

  assert.equal(repairedTwice.ok, true);
  if (!repairedTwice.ok) return;

  assert.deepEqual(rejected.repairs, []);
  assert.deepEqual(
    repairedOnce.value.repairs.map((repair) => repair.prompt.version),
    ["prompt-0.1.0"],
  );
  assert.deepEqual(
    repairedTwice.value.repairs.map((repair) => repair.prompt.version),
    ["prompt-0.1.0", "prompt-0.1.1"],
  );
  assert.deepEqual(repairedTwice.value.repairs[0], firstRepair);
  assert.deepEqual(repairedTwice.value.repairs[1], secondRepair);
  assert.equal(Object.isFrozen(repairedTwice.value.repairs), true);
  assert.equal(Object.isFrozen(repairedTwice.value.repairs[0]), true);
});

test("creates candidates with deterministic ID and clock collaborators", () => {
  const input = candidateFactoryInput();
  const collaborators = {
    nextCandidateId: sequenceDouble(["candidate-fixed-001"]),
    now: fixedClock(CREATED_AT),
  };

  const result = createQuatrainCandidateWithCollaborators(input, collaborators);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.id, "candidate-fixed-001");
  assert.equal(result.value.provenance.createdAt, CREATED_AT);
  assert.deepEqual(result.value.provenance.generator, input.provenance.generator);
  assert.equal(result.value.events[0]?.at, CREATED_AT);
});

test("serializes stable JSON snapshots from fixed doubles", () => {
  const createWithFixedDoubles = (): QuatrainCandidate => {
    const result = createQuatrainCandidateWithCollaborators(candidateFactoryInput(), {
      nextCandidateId: sequenceDouble(["candidate-fixed-001"]),
      now: fixedClock(CREATED_AT),
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      throw new Error("Expected deterministic candidate creation to succeed");
    }

    return applyTransition(result.value, validationRequestedTransition());
  };

  const firstSnapshot = toQuatrainCandidateSnapshot(createWithFixedDoubles());
  const secondSnapshot = toQuatrainCandidateSnapshot(createWithFixedDoubles());

  assert.deepEqual(firstSnapshot, secondSnapshot);
  assert.deepEqual(JSON.parse(JSON.stringify(firstSnapshot)), firstSnapshot);
  assert.deepEqual(firstSnapshot, {
    schemaVersion: "quatrain-candidate-snapshot/v1",
    id: "candidate-fixed-001",
    batchId: "batch-001",
    state: "VALIDACION_PENDIENTE",
    brief: {
      context: "Un gato promete compartir la merienda",
      tone: "absurdo y cercano",
      candidateCount: 100,
      topK: 5,
      minimumScore: 80,
      scheme: "0-A-0-A",
      rhyme: "consonant",
      metricPositions: 7,
    },
    plan: completePlan(),
    provenance: provenance(),
    events: [
      {
        type: "CANDIDATE_CREATED",
        at: CREATED_AT,
      },
      {
        type: "VALIDATION_REQUESTED",
        at: VALIDATION_STARTED_AT,
        validators: [
          { name: "metric", version: "metric-0.1.0" },
          { name: "rhyme", version: "rhyme-0.1.0" },
          { name: "lexicon", version: "lexicon-0.1.0" },
        ],
      },
    ],
    rejections: [],
    repairs: [],
    validationRequest: {
      at: VALIDATION_STARTED_AT,
      validators: [
        { name: "metric", version: "metric-0.1.0" },
        { name: "rhyme", version: "rhyme-0.1.0" },
        { name: "lexicon", version: "lexicon-0.1.0" },
      ],
    },
  });
});

test("serializes rejection and repair history without sharing mutable arrays", () => {
  const rejected = candidateInState("RECHAZADO");
  const repair: CandidateRepairInput = {
    at: "2026-08-30T09:22:00.000Z",
    repairedBy: "writer-repair",
    sourceRejectionPointer: "/validation/metric/V3",
    changes: [
      {
        slot: "V3",
        before: "se distrae con hambre repentina",
        after: "se despista con su hambre",
      },
    ],
    prompt: { id: "repair-metric-verse", version: "prompt-0.1.0" },
    model: { provider: "openai", name: "gpt-5", version: "2026-08-30" },
  };
  const repaired = recordCandidateRepair(rejected, repair);

  assert.equal(repaired.ok, true);
  if (!repaired.ok) return;

  const snapshot = toQuatrainCandidateSnapshot(repaired.value);

  assert.equal(snapshot.state, "RECHAZADO");
  assert.deepEqual(snapshot.rejections, repaired.value.rejections);
  assert.deepEqual(snapshot.repairs, [repair]);
  assert.equal(snapshot.events.at(-1)?.type, "REPAIR_RECORDED");
  assert.notEqual(snapshot.events, repaired.value.events);
  assert.notEqual(snapshot.repairs, repaired.value.repairs);
  assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), snapshot);
});

function ripioDetection(
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

test("identifies states that have already passed hard validation", () => {
  const passed = [
    "VALIDO",
    "PUNTUADO",
    "BAJO_UMBRAL",
    "SELECCIONADO",
    "APROBADO",
    "RECHAZADO_EDITORIAL",
    "EXPORTADO",
  ] as const;
  const blocked = ["GENERADO", "VALIDACION_PENDIENTE", "RECHAZADO"] as const;

  for (const state of passed) {
    assert.equal(hasPassedHardValidation(state), true, `${state} should count as validated`);
  }

  for (const state of blocked) {
    assert.equal(hasPassedHardValidation(state), false, `${state} should count as blocked`);
  }
});

test("records a ripio detection without changing state or hard validation results", () => {
  const candidate = candidateInState("VALIDO");
  const result = recordRipioDetection(candidate, ripioDetection());

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.state, "VALIDO");
  assert.equal(result.value.plan, candidate.plan);
  assert.equal(result.value.provenance, candidate.provenance);
  assert.equal(result.value.validationCompletion, candidate.validationCompletion);
  assert.deepEqual(result.value.rejections, candidate.rejections);
  assert.deepEqual(result.value.ripioDetection, ripioDetection());
  assert.equal(result.value.events.at(-1)?.type, "RIPIO_DETECTION_RECORDED");
  assert.deepEqual(result.value.events.at(-1)?.ripioDetection, result.value.ripioDetection);
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.ripioDetection), true);
  assert.equal(Object.isFrozen(result.value.ripioDetection?.fragments), true);
  assert.equal(Object.isFrozen(result.value.ripioDetection?.signals), true);
  assert.equal(Object.isFrozen(result.value.ripioDetection?.llm.fragments), true);
});

test("rejects ripio detection when a hard blocker is present", () => {
  const blockedStates: readonly QuatrainCandidate["state"][] = [
    "GENERADO",
    "VALIDACION_PENDIENTE",
    "RECHAZADO",
  ];

  for (const state of blockedStates) {
    const candidate = candidateInState(state);
    const result = recordRipioDetection(candidate, ripioDetection());

    assert.equal(result.ok, false, `${state} should reject the detection`);
    if (result.ok) continue;

    assert.equal(result.error.code, "STATE_NOT_ELIGIBLE");
    assert.equal(result.error.currentState, state);
    assert.equal(candidate.state, state);
    assert.equal(candidate.ripioDetection, undefined);
  }
});

test("rejects inconsistent ripio presence relative to severity", () => {
  const candidate = candidateInState("VALIDO");

  const severityNoneWithPresence = recordRipioDetection(
    candidate,
    ripioDetection({ severity: "NINGUNO", presence: true }),
  );

  assert.equal(severityNoneWithPresence.ok, false);
  if (!severityNoneWithPresence.ok) {
    assert.equal(severityNoneWithPresence.error.code, "INCONSISTENT_PRESENCE");
  }

  const severityLeveWithoutPresence = recordRipioDetection(
    candidate,
    ripioDetection({ severity: "LEVE", presence: false }),
  );

  assert.equal(severityLeveWithoutPresence.ok, false);
  if (!severityLeveWithoutPresence.ok) {
    assert.equal(severityLeveWithoutPresence.error.code, "INCONSISTENT_PRESENCE");
  }
});

test("rejects unrecognized ripio severity", () => {
  const candidate = candidateInState("VALIDO");
  const result = recordRipioDetection(
    candidate,
    ripioDetection({ severity: "ENORME" as RipioSeverity }),
  );

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, "INVALID_SEVERITY");
  }
});

test("rejects malformed ripio fragments, signals and LLM verdict", () => {
  const candidate = candidateInState("VALIDO");

  const invalidFragmentSlot = recordRipioDetection(
    candidate,
    ripioDetection({
      fragments: [{ slot: "V5" as VerseSlot, fragment: "hola", reason: "raro" }],
    }),
  );

  assert.equal(invalidFragmentSlot.ok, false);
  if (!invalidFragmentSlot.ok) {
    assert.equal(invalidFragmentSlot.error.code, "INVALID_FRAGMENT");
  }

  const invalidSignal = recordRipioDetection(
    candidate,
    ripioDetection({
      signals: [
        {
          patternId: "",
          patternVersion: "0.1.0",
          slot: "V3",
          fragment: "es que",
          severity: "LEVE",
          reason: "relleno",
        },
      ],
    }),
  );

  assert.equal(invalidSignal.ok, false);
  if (!invalidSignal.ok) {
    assert.equal(invalidSignal.error.code, "INVALID_SIGNAL");
  }

  const invalidLlmConfidence = recordRipioDetection(
    candidate,
    ripioDetection({
      llm: {
        severity: "NINGUNO",
        confidence: 2,
        fragments: [],
        explanation: "nada",
      },
    }),
  );

  assert.equal(invalidLlmConfidence.ok, false);
  if (!invalidLlmConfidence.ok) {
    assert.equal(invalidLlmConfidence.error.code, "INVALID_LLM");
    assert.equal(invalidLlmConfidence.error.path, "$.llm.confidence");
  }
});



test("records a coherence assessment without changing state or hard validation results", () => {
  const candidate = candidateInState("VALIDO");
  const result = recordCoherenceAssessment(candidate, coherenceAssessment());

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.state, "VALIDO");
  assert.equal(result.value.plan, candidate.plan);
  assert.equal(result.value.provenance, candidate.provenance);
  assert.equal(result.value.validationCompletion, candidate.validationCompletion);
  assert.deepEqual(result.value.rejections, candidate.rejections);
  assert.equal(result.value.score, candidate.score);
  assert.deepEqual(result.value.coherenceAssessment, coherenceAssessment());
  assert.equal(result.value.events.at(-1)?.type, "COHERENCE_RECORDED");
  assert.deepEqual(
    result.value.events.at(-1)?.coherenceAssessment,
    result.value.coherenceAssessment,
  );
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.coherenceAssessment), true);
  assert.equal(Object.isFrozen(result.value.coherenceAssessment?.transitions), true);
});

test("rejects coherence assessment when a hard blocker is present", () => {
  const blockedStates: readonly QuatrainCandidate["state"][] = [
    "GENERADO",
    "VALIDACION_PENDIENTE",
    "RECHAZADO",
  ];

  for (const state of blockedStates) {
    const candidate = candidateInState(state);
    const result = recordCoherenceAssessment(candidate, coherenceAssessment());

    assert.equal(result.ok, false, `${state} should reject the assessment`);
    if (result.ok) continue;

    assert.equal(result.error.code, "STATE_NOT_ELIGIBLE");
    assert.equal(result.error.currentState, state);
    assert.equal(candidate.state, state);
    assert.equal(candidate.coherenceAssessment, undefined);
  }
});

test("rejects out-of-range coherence note and confidence", () => {
  const candidate = candidateInState("VALIDO");

  for (const note of [16, -1]) {
    const result = recordCoherenceAssessment(candidate, coherenceAssessment({ note }));

    assert.equal(result.ok, false, `note ${note} should be rejected`);
    if (result.ok) continue;

    assert.equal(result.error.code, "INVALID_NOTE");
    assert.equal(result.error.note, note);
  }

  for (const confidence of [1.5, -0.1]) {
    const result = recordCoherenceAssessment(
      candidate,
      coherenceAssessment({ confidence }),
    );

    assert.equal(result.ok, false, `confidence ${confidence} should be rejected`);
    if (result.ok) continue;

    assert.equal(result.error.code, "INVALID_CONFIDENCE");
    assert.equal(result.error.confidence, confidence);
  }
});

test("rejects malformed coherence transitions", () => {
  const candidate = candidateInState("VALIDO");

  const missingStep = recordCoherenceAssessment(
    candidate,
    coherenceAssessment({
      transitions: coherenceAssessment().transitions.filter((transition) => transition.from !== "V2"),
    }),
  );

  assert.equal(missingStep.ok, false);
  if (!missingStep.ok) {
    assert.equal(missingStep.error.code, "INVALID_TRANSITION");
  }

  const wrongOrder = recordCoherenceAssessment(
    candidate,
    coherenceAssessment({
      transitions: [
        coherenceAssessment().transitions[1],
        coherenceAssessment().transitions[0],
        coherenceAssessment().transitions[2],
      ],
    }),
  );

  assert.equal(wrongOrder.ok, false);
  if (!wrongOrder.ok) {
    assert.equal(wrongOrder.error.code, "INVALID_TRANSITION");
  }

  const emptyRelation = recordCoherenceAssessment(
    candidate,
    coherenceAssessment({
      transitions: [
        {
          from: "V1" as VerseSlot,
          to: "V2" as VerseSlot,
          relation: "   ",
          evidence: "el gato sigue siendo el sujeto",
        },
        coherenceAssessment().transitions[1],
        coherenceAssessment().transitions[2],
      ],
    }),
  );

  assert.equal(emptyRelation.ok, false);
  if (!emptyRelation.ok) {
    assert.equal(emptyRelation.error.code, "INVALID_TRANSITION");
  }

  const emptyEvidence = recordCoherenceAssessment(
    candidate,
    coherenceAssessment({
      transitions: [
        {
          from: "V1" as VerseSlot,
          to: "V2" as VerseSlot,
          relation: "continuidad de referente",
          evidence: "",
        },
        coherenceAssessment().transitions[1],
        coherenceAssessment().transitions[2],
      ],
    }),
  );

  assert.equal(emptyEvidence.ok, false);
  if (!emptyEvidence.ok) {
    assert.equal(emptyEvidence.error.code, "INVALID_TRANSITION");
  }
});


test("records a naturalness assessment without changing state or hard validation results", () => {
  const candidate = candidateInState("VALIDO");
  const result = recordNaturalnessAssessment(candidate, naturalnessAssessment());

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.state, "VALIDO");
  assert.equal(result.value.plan, candidate.plan);
  assert.equal(result.value.provenance, candidate.provenance);
  assert.equal(result.value.validationCompletion, candidate.validationCompletion);
  assert.deepEqual(result.value.rejections, candidate.rejections);
  assert.equal(result.value.score, candidate.score);
  assert.deepEqual(result.value.naturalnessAssessment, naturalnessAssessment());
  assert.equal(result.value.events.at(-1)?.type, "NATURALNESS_RECORDED");
  assert.deepEqual(
    result.value.events.at(-1)?.naturalnessAssessment,
    result.value.naturalnessAssessment,
  );
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.naturalnessAssessment), true);
  assert.equal(Object.isFrozen(result.value.naturalnessAssessment?.observations), true);
});

test("rejects naturalness assessment when a hard blocker is present", () => {
  const blockedStates: readonly QuatrainCandidate["state"][] = [
    "GENERADO",
    "VALIDACION_PENDIENTE",
    "RECHAZADO",
  ];

  for (const state of blockedStates) {
    const candidate = candidateInState(state);
    const result = recordNaturalnessAssessment(candidate, naturalnessAssessment());

    assert.equal(result.ok, false, `${state} should reject the assessment`);
    if (result.ok) continue;

    assert.equal(result.error.code, "STATE_NOT_ELIGIBLE");
    assert.equal(result.error.currentState, state);
    assert.equal(candidate.state, state);
    assert.equal(candidate.naturalnessAssessment, undefined);
  }
});

test("rejects out-of-range naturalness note and confidence", () => {
  const candidate = candidateInState("VALIDO");

  for (const note of [21, -1]) {
    const result = recordNaturalnessAssessment(candidate, naturalnessAssessment({ note }));

    assert.equal(result.ok, false, `note ${note} should be rejected`);
    if (result.ok) continue;

    assert.equal(result.error.code, "INVALID_NOTE");
    assert.equal(result.error.note, note);
  }

  for (const confidence of [1.5, -0.1]) {
    const result = recordNaturalnessAssessment(
      candidate,
      naturalnessAssessment({ confidence }),
    );

    assert.equal(result.ok, false, `confidence ${confidence} should be rejected`);
    if (result.ok) continue;

    assert.equal(result.error.code, "INVALID_CONFIDENCE");
    assert.equal(result.error.confidence, confidence);
  }
});

test("rejects malformed naturalness observations", () => {
  const candidate = candidateInState("VALIDO");

  const invalidSlot = recordNaturalnessAssessment(
    candidate,
    naturalnessAssessment({
      observations: [{ slot: "V5" as VerseSlot, fragment: "hola", reason: "raro" }],
    }),
  );

  assert.equal(invalidSlot.ok, false);
  if (!invalidSlot.ok) {
    assert.equal(invalidSlot.error.code, "INVALID_OBSERVATION");
    assert.equal(invalidSlot.error.path, "$.observations[0]");
  }

  const emptyFragment = recordNaturalnessAssessment(
    candidate,
    naturalnessAssessment({
      observations: [{ slot: "V3", fragment: "   ", reason: "raro" }],
    }),
  );

  assert.equal(emptyFragment.ok, false);
  if (!emptyFragment.ok) {
    assert.equal(emptyFragment.error.code, "INVALID_OBSERVATION");
  }

  const emptyReason = recordNaturalnessAssessment(
    candidate,
    naturalnessAssessment({
      observations: [{ slot: "V3", fragment: "hola", reason: "" }],
    }),
  );

  assert.equal(emptyReason.ok, false);
  if (!emptyReason.ok) {
    assert.equal(emptyReason.error.code, "INVALID_OBSERVATION");
  }

  const duplicateSlot = recordNaturalnessAssessment(
    candidate,
    naturalnessAssessment({
      observations: [
        { slot: "V3", fragment: "hola", reason: "raro" },
        { slot: "V3", fragment: "adios", reason: "forzado" },
      ],
    }),
  );

  assert.equal(duplicateSlot.ok, false);
  if (!duplicateSlot.ok) {
    assert.equal(duplicateSlot.error.code, "INVALID_OBSERVATION");
    assert.equal(duplicateSlot.error.path, "$.observations[1]");
  }
});



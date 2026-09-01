import test from "node:test";
import assert from "node:assert/strict";

import {
  assessCoherence,
  COHERENCE_RUBRIC_VERSION,
  type CoherenceAssessmentRequest,
  type CoherenceVerse,
} from "./coherence-assessment/index.js";
import {
  createGenerationBrief,
  createQuatrainCandidate,
  transitionQuatrainCandidate,
  type QuatrainCandidate,
} from "../domain/index.js";
import { FixtureStructuredLlmGenerator } from "../testing/structured-llm-generation-fake.js";
import type { StructuredLlmGenerationPort } from "../ports/structured-llm-generation/index.js";

const COHERENT_VERSES: readonly CoherenceVerse[] = [
  { slot: "V1", text: "El gato promete compartir la merienda." },
  { slot: "V2", text: "Guardó el melón para su buen vecino." },
  { slot: "V3", text: "Se distrajo con hambre en el camino." },
  { slot: "V4", text: "Y al final compartió solo el olor del jamón." },
];

const COHERENT_TRANSITIONS = [
  {
    from: "V1",
    to: "V2",
    relation: "continuidad de referente",
    evidence: "el gato sigue siendo el sujeto al guardar el melón",
  },
  {
    from: "V2",
    to: "V3",
    relation: "causalidad",
    evidence: "el hambre explica la distracción en el camino",
  },
  {
    from: "V3",
    to: "V4",
    relation: "progresión al remate",
    evidence: "la distracción desemboca en compartir solo el olor",
  },
];

function brief() {
  const result = createGenerationBrief({
    context: "Un gato promete compartir la merienda",
    tone: "absurdo y cercano",
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected valid brief fixture");

  return result.value;
}

function baseCandidate(): QuatrainCandidate {
  const result = createQuatrainCandidate({
    id: "candidate-001",
    batchId: "batch-001",
    brief: brief(),
    plan: {
      rhymeScheme: "0-A-0-A",
      metricPositions: 7,
      slots: [
        {
          slot: "V1",
          role: "PRESENTACION",
          semanticAnchor: "presenta al gato y la merienda",
          plannedFinalWord: "merienda",
        },
        {
          slot: "V2",
          role: "PREPARACION",
          semanticAnchor: "guarda el melón para el vecino",
          plannedFinalWord: "vecino",
        },
        {
          slot: "V3",
          role: "GIRO_TENSION",
          semanticAnchor: "se distrae con hambre",
          plannedFinalWord: "camino",
        },
        {
          slot: "V4",
          role: "REMATE",
          semanticAnchor: "comparte solo el olor",
          plannedFinalWord: "jamón",
        },
      ],
    },
    provenance: {
      createdAt: "2026-08-31T14:00:00.000Z",
      generator: { name: "QuatrainGenerator", version: "0.1.0" },
      prompt: { id: "writer-from-punchline", version: "0.1.0" },
      model: { provider: "openai", name: "gpt-5", version: "2026-08-30" },
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected valid candidate fixture");

  return result.value;
}

function applyValidationRequested(candidate: QuatrainCandidate): QuatrainCandidate {
  const result = transitionQuatrainCandidate(candidate, {
    type: "VALIDATION_REQUESTED",
    at: "2026-08-31T14:01:00.000Z",
    validators: [
      { name: "metric", version: "metric-0.1.0" },
      { name: "rhyme", version: "rhyme-0.1.0" },
      { name: "lexicon", version: "lexicon-0.1.0" },
    ],
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected validation request to succeed");

  return result.value;
}

function validCandidate(): QuatrainCandidate {
  const result = transitionQuatrainCandidate(applyValidationRequested(baseCandidate()), {
    type: "HARD_VALIDATION_PASSED",
    at: "2026-08-31T14:02:00.000Z",
    diagnostics: [
      {
        validator: "metric",
        version: "metric-0.1.0",
        result: "VALIDO",
        evidence: { pointer: "/validation/metric" },
      },
      {
        validator: "rhyme",
        version: "rhyme-0.1.0",
        result: "VALIDO",
        evidence: { pointer: "/validation/rhyme" },
      },
    ],
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected hard validation pass to succeed");

  return result.value;
}

function rejectedCandidate(): QuatrainCandidate {
  const result = transitionQuatrainCandidate(applyValidationRequested(baseCandidate()), {
    type: "HARD_VALIDATION_REJECTED",
    at: "2026-08-31T14:02:00.000Z",
    rejection: {
      validator: "metric",
      version: "metric-0.1.0",
      reason: "V3 exige un hiato artificial.",
      evidence: { pointer: "/validation/metric/V3", excerpt: "con hambre en el camino" },
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected hard validation rejection to succeed");

  return result.value;
}

function generatorWith(output: unknown): StructuredLlmGenerationPort {
  return new FixtureStructuredLlmGenerator([
    {
      operation: "assess-coherence",
      output,
      provider: "fixture-provider",
      model: "fixture-judge-v1",
      providerRequestId: "req-coherence-001",
      completedAt: "2026-08-31T15:00:00.000Z",
      durationMs: 42,
      usage: {
        inputTokens: 140,
        outputTokens: 60,
      },
    },
  ]);
}

function request(
  overrides: Partial<CoherenceAssessmentRequest> = {},
): CoherenceAssessmentRequest {
  return {
    candidate: validCandidate(),
    verses: COHERENT_VERSES,
    generator: generatorWith({
      note: 14,
      confidence: 0.9,
      transitions: COHERENT_TRANSITIONS,
    }),
    limits: { timeoutMs: 1_000, maxOutputTokens: 500 },
    ...overrides,
  };
}

test("returns a traced coherence assessment for an approved coherent anchor", async () => {
  const result = await assessCoherence(request());

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.note, 14);
  assert.equal(result.value.confidence, 0.9);
  assert.deepEqual(result.value.transitions, COHERENT_TRANSITIONS);
  assert.equal(result.value.rubricVersion, COHERENCE_RUBRIC_VERSION);
  assert.deepEqual(result.value.prompt, { id: "coherence-rubric", version: "0.1.0" });
  assert.deepEqual(result.value.model, { provider: "fixture-provider", name: "fixture-judge-v1" });
  assert.equal(result.value.assessedAt, "2026-08-31T15:00:00.000Z");
  assert.equal(result.value.providerRequestId, "req-coherence-001");
});

test("returns a low note identifying the broken transition for a referent rupture", async () => {
  const result = await assessCoherence(
    request({
      generator: generatorWith({
        note: 4,
        confidence: 0.85,
        transitions: [
          {
            from: "V1",
            to: "V2",
            relation: "ruptura de referente",
            evidence: "V2 introduce un barco sin relación con el gato",
          },
          {
            from: "V2",
            to: "V3",
            relation: "sin conexión",
            evidence: "la luna no retoma ningún referente previo",
          },
          {
            from: "V3",
            to: "V4",
            relation: "sin causalidad",
            evidence: "el remate no desemboca de los versos anteriores",
          },
        ],
      }),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.note, 4);
  assert.deepEqual(result.value.transitions[0], {
    from: "V1",
    to: "V2",
    relation: "ruptura de referente",
    evidence: "V2 introduce un barco sin relación con el gato",
  });
});

test("keeps a funny but disconnected quatrain from scoring coherent", async () => {
  const result = await assessCoherence(
    request({
      verses: [
        { slot: "V1", text: "El gato promete compartir la merienda." },
        { slot: "V2", text: "Un barco pirata asaltó al vecino." },
        { slot: "V3", text: "La luna baila sola en el camino." },
        { slot: "V4", text: "Y al final compartió solo el olor del jamón." },
      ],
      generator: generatorWith({
        note: 3,
        confidence: 0.9,
        transitions: [
          {
            from: "V1",
            to: "V2",
            relation: "ruptura de referente",
            evidence: "el barco pirata no retoma el gato ni la merienda",
          },
          {
            from: "V2",
            to: "V3",
            relation: "sin conexión",
            evidence: "la luna no continúa el asalto",
          },
          {
            from: "V3",
            to: "V4",
            relation: "sin causalidad",
            evidence: "el remate ignora los versos intermedios",
          },
        ],
      }),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.note, 3);
});

test("does not run the evaluator when a hard blocker is present", async () => {
  const result = await assessCoherence(
    request({
      candidate: rejectedCandidate(),
      generator: new FixtureStructuredLlmGenerator([]),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "CANDIDATE_NOT_ELIGIBLE");
  assert.equal(result.error.currentState, "RECHAZADO");
});

test("rejects an incomplete set of verses before calling the model", async () => {
  const result = await assessCoherence(
    request({
      verses: COHERENT_VERSES.filter((verse) => verse.slot !== "V3"),
      generator: new FixtureStructuredLlmGenerator([]),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "INCOMPLETE_VERSES");
  assert.deepEqual(result.error.missingSlots, ["V3"]);
});

test("rejects out-of-range notes through schema validation", async () => {
  const result = await assessCoherence(
    request({
      generator: generatorWith({
        note: 16,
        confidence: 0.9,
        transitions: COHERENT_TRANSITIONS,
      }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

test("rejects malformed LLM output through schema validation", async () => {
  const result = await assessCoherence(
    request({
      generator: generatorWith({ note: "catorce", confidence: "alta" }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

test("rejects an output missing a V1→V4 transition step", async () => {
  const result = await assessCoherence(
    request({
      generator: generatorWith({
        note: 12,
        confidence: 0.8,
        transitions: COHERENT_TRANSITIONS.filter((transition) => transition.from !== "V2"),
      }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

test("rejects a note without transition evidence", async () => {
  const result = await assessCoherence(
    request({
      generator: generatorWith({ note: 15, confidence: 0.9, transitions: [] }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

test("rejects output that smuggles humor or remate dimensions into coherence", async () => {
  const result = await assessCoherence(
    request({
      generator: generatorWith({
        note: 14,
        confidence: 0.9,
        transitions: COHERENT_TRANSITIONS,
        humor: 5,
        remate: 9,
      }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

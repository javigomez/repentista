import test from "node:test";
import assert from "node:assert/strict";

import {
  assessNaturalness,
  NATURALNESS_RUBRIC_VERSION,
  type NaturalnessAssessmentRequest,
  type NaturalnessVerse,
} from "./naturalness-assessment/index.js";
import {
  createGenerationBrief,
  createQuatrainCandidate,
  transitionQuatrainCandidate,
  type QuatrainCandidate,
} from "../domain/index.js";
import { FixtureStructuredLlmGenerator } from "../testing/structured-llm-generation-fake.js";
import type { StructuredLlmGenerationPort } from "../ports/structured-llm-generation/index.js";

const NATURAL_VERSES: readonly NaturalnessVerse[] = [
  { slot: "V1", text: "El gato promete compartir la merienda." },
  { slot: "V2", text: "Guardó el melón para su buen vecino." },
  { slot: "V3", text: "Se distrajo con hambre en el camino." },
  { slot: "V4", text: "Y al final compartió solo el olor del jamón." },
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
      operation: "assess-naturalness",
      output,
      provider: "fixture-provider",
      model: "fixture-judge-v1",
      providerRequestId: "req-naturalness-001",
      completedAt: "2026-08-31T15:00:00.000Z",
      durationMs: 42,
      usage: {
        inputTokens: 120,
        outputTokens: 40,
      },
    },
  ]);
}

function request(
  overrides: Partial<NaturalnessAssessmentRequest> = {},
): NaturalnessAssessmentRequest {
  return {
    candidate: validCandidate(),
    verses: NATURAL_VERSES,
    generator: generatorWith({ note: 19, confidence: 0.95, observations: [] }),
    limits: { timeoutMs: 1_000, maxOutputTokens: 400 },
    ...overrides,
  };
}

test("returns a traced naturalness assessment for an approved natural anchor", async () => {
  const result = await assessNaturalness(request());

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.note, 19);
  assert.equal(result.value.confidence, 0.95);
  assert.deepEqual(result.value.observations, []);
  assert.equal(result.value.rubricVersion, NATURALNESS_RUBRIC_VERSION);
  assert.deepEqual(result.value.prompt, { id: "naturalness-rubric", version: "0.1.0" });
  assert.deepEqual(result.value.model, { provider: "fixture-provider", name: "fixture-judge-v1" });
  assert.equal(result.value.assessedAt, "2026-08-31T15:00:00.000Z");
  assert.equal(result.value.providerRequestId, "req-naturalness-001");
});

test("returns a low note with citations for an unnatural anchor", async () => {
  const result = await assessNaturalness(
    request({
      generator: generatorWith({
        note: 6,
        confidence: 0.8,
        observations: [
          {
            slot: "V3",
            fragment: "con hambre en el camino",
            reason: "La frase se fuerza para cerrar la rima.",
          },
        ],
      }),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.note, 6);
  assert.deepEqual(result.value.observations, [
    { slot: "V3", fragment: "con hambre en el camino", reason: "La frase se fuerza para cerrar la rima." },
  ]);
});

test("does not run the evaluator when a hard blocker is present", async () => {
  const result = await assessNaturalness(
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
  const result = await assessNaturalness(
    request({
      verses: NATURAL_VERSES.filter((verse) => verse.slot !== "V3"),
      generator: new FixtureStructuredLlmGenerator([]),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "INCOMPLETE_VERSES");
  assert.deepEqual(result.error.missingSlots, ["V3"]);
});

test("rejects out-of-range notes through schema validation", async () => {
  const result = await assessNaturalness(
    request({
      generator: generatorWith({ note: 21, confidence: 0.9, observations: [] }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

test("rejects malformed LLM output through schema validation", async () => {
  const result = await assessNaturalness(
    request({
      generator: generatorWith({ note: "diecinueve", confidence: "alta" }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

test("rejects citations that do not exist in the assessed verse", async () => {
  const result = await assessNaturalness(
    request({
      generator: generatorWith({
        note: 8,
        confidence: 0.7,
        observations: [
          {
            slot: "V1",
            fragment: "no aparece en el verso",
            reason: "Cita inventada.",
          },
        ],
      }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "CITATION_NOT_IN_VERSE");
  assert.equal(result.error.slot, "V1");
  assert.equal(result.error.fragment, "no aparece en el verso");
});

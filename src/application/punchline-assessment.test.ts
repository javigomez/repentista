import test from "node:test";
import assert from "node:assert/strict";

import {
  assessPunchline,
  PUNCHLINE_RUBRIC_VERSION,
  type PunchlineAssessmentRequest,
  type PunchlineVerse,
} from "./punchline-assessment/index.js";
import {
  createGenerationBrief,
  createQuatrainCandidate,
  transitionQuatrainCandidate,
  type QuatrainCandidate,
} from "../domain/index.js";
import { FixtureStructuredLlmGenerator } from "../testing/structured-llm-generation-fake.js";
import type { StructuredLlmGenerationPort } from "../ports/structured-llm-generation/index.js";

const PREPARED_VERSES: readonly PunchlineVerse[] = [
  { slot: "V1", text: "El gato promete compartir la merienda." },
  { slot: "V2", text: "Guardó el melón para su buen vecino." },
  { slot: "V3", text: "Se distrajo con hambre en el camino." },
  { slot: "V4", text: "Y al final compartió solo el olor del jamón." },
];

const PREPARED_OUTPUT = {
  note: 9,
  confidence: 0.9,
  expectation: "V1–V3 construyen la promesa de compartir la merienda",
  expectationEvidence: ["promete compartir la merienda"],
  resolution: "V4 convierte la promesa en un giro: solo comparte el olor",
  resolutionEvidence: "solo el olor del jamón",
  twistDegree: "MODERADO",
  contextDependency: "TOTAL",
};

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
      operation: "assess-punchline",
      output,
      provider: "fixture-provider",
      model: "fixture-judge-v1",
      providerRequestId: "req-punchline-001",
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
  overrides: Partial<PunchlineAssessmentRequest> = {},
): PunchlineAssessmentRequest {
  return {
    candidate: validCandidate(),
    verses: PREPARED_VERSES,
    generator: generatorWith(PREPARED_OUTPUT),
    limits: { timeoutMs: 1_000, maxOutputTokens: 500 },
    ...overrides,
  };
}

test("returns a traced punchline assessment for a prepared, resolved anchor", async () => {
  const result = await assessPunchline(request());

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.note, 9);
  assert.equal(result.value.confidence, 0.9);
  assert.equal(result.value.expectation, PREPARED_OUTPUT.expectation);
  assert.deepEqual(result.value.expectationEvidence, PREPARED_OUTPUT.expectationEvidence);
  assert.equal(result.value.resolution, PREPARED_OUTPUT.resolution);
  assert.equal(result.value.resolutionEvidence, PREPARED_OUTPUT.resolutionEvidence);
  assert.equal(result.value.twistDegree, "MODERADO");
  assert.equal(result.value.contextDependency, "TOTAL");
  assert.equal(result.value.rubricVersion, PUNCHLINE_RUBRIC_VERSION);
  assert.deepEqual(result.value.prompt, { id: "punchline-rubric", version: "0.1.0" });
  assert.deepEqual(result.value.model, { provider: "fixture-provider", name: "fixture-judge-v1" });
  assert.equal(result.value.assessedAt, "2026-08-31T15:00:00.000Z");
  assert.equal(result.value.providerRequestId, "req-punchline-001");
});

test("scores an unprepared twist low even when it is funny", async () => {
  const result = await assessPunchline(
    request({
      verses: [
        { slot: "V1", text: "El gato promete compartir la merienda." },
        { slot: "V2", text: "Guardó el melón para su buen vecino." },
        { slot: "V3", text: "Se distrajo con hambre en el camino." },
        { slot: "V4", text: "Y de pronto llegó un pirata con limón." },
      ],
      generator: generatorWith({
        note: 3,
        confidence: 0.8,
        expectation: "V1–V3 preparan una escena doméstica sin tensión",
        expectationEvidence: ["promete compartir la merienda"],
        resolution: "V4 introduce un pirata sin apoyo en la escena previa",
        resolutionEvidence: "llegó un pirata",
        twistDegree: "FUERTE",
        contextDependency: "NULA",
      }),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.note, 3);
  assert.equal(result.value.twistDegree, "FUERTE");
  assert.equal(result.value.contextDependency, "NULA");
});

test("flags a merely descriptive ending as lacking a punchline", async () => {
  const result = await assessPunchline(
    request({
      verses: [
        { slot: "V1", text: "El gato promete compartir la merienda." },
        { slot: "V2", text: "Guardó el melón para su buen vecino." },
        { slot: "V3", text: "Se distrajo con hambre en el camino." },
        { slot: "V4", text: "Y luego se sentó a mirar el camino tranquilo." },
      ],
      generator: generatorWith({
        note: 2,
        confidence: 0.85,
        expectation: "V1–V3 construyen la tensión del gato que se distrae con hambre",
        expectationEvidence: ["distrajo con hambre"],
        resolution: "V4 continúa describiendo la escena sin resolver la tensión",
        resolutionEvidence: "se sentó a mirar",
        twistDegree: "NINGUNO",
        contextDependency: "PARCIAL",
      }),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.note, 2);
  assert.equal(result.value.twistDegree, "NINGUNO");
});

test("awards a solid non-humorous remate without demanding comedy", async () => {
  const result = await assessPunchline(
    request({
      verses: [
        { slot: "V1", text: "El gato promete compartir la merienda." },
        { slot: "V2", text: "Guardó el melón para su buen vecino." },
        { slot: "V3", text: "Se distrajo con hambre en el camino." },
        { slot: "V4", text: "Por eso entregó el melón a su vecino." },
      ],
      generator: generatorWith({
        note: 8,
        confidence: 0.9,
        expectation: "V1–V3 preparan al gato que debe entregar lo prometido",
        expectationEvidence: ["el melón para su buen vecino"],
        resolution: "V4 cierra la promesa entregando el melón al vecino",
        resolutionEvidence: "entregó el melón",
        twistDegree: "LEVE",
        contextDependency: "TOTAL",
      }),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.note, 8);
  assert.equal(result.value.twistDegree, "LEVE");
  assert.equal(result.value.contextDependency, "TOTAL");
});

test("does not run the evaluator when a hard blocker is present", async () => {
  const result = await assessPunchline(
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
  const result = await assessPunchline(
    request({
      verses: PREPARED_VERSES.filter((verse) => verse.slot !== "V4"),
      generator: new FixtureStructuredLlmGenerator([]),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "INCOMPLETE_VERSES");
  assert.deepEqual(result.error.missingSlots, ["V4"]);
});

test("rejects out-of-range notes through schema validation", async () => {
  const result = await assessPunchline(
    request({
      generator: generatorWith({ ...PREPARED_OUTPUT, note: 11 }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

test("rejects malformed LLM output through schema validation", async () => {
  const result = await assessPunchline(
    request({
      generator: generatorWith({ note: "nueve", confidence: "alta" }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

test("rejects an output missing the expectation or resolution summary", async () => {
  const withoutExpectation = await assessPunchline(
    request({
      generator: generatorWith({ ...PREPARED_OUTPUT, expectation: "" }),
    }),
  );

  assert.equal(withoutExpectation.ok, false);
  if (!withoutExpectation.ok) {
    assert.equal(withoutExpectation.error.code, "LLM_ASSESSMENT_FAILED");
    assert.equal(withoutExpectation.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
  }

  const withoutResolution = await assessPunchline(
    request({
      generator: generatorWith({ ...PREPARED_OUTPUT, resolution: "   " }),
    }),
  );

  assert.equal(withoutResolution.ok, false);
  if (!withoutResolution.ok) {
    assert.equal(withoutResolution.error.code, "LLM_ASSESSMENT_FAILED");
    assert.equal(withoutResolution.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
  }
});

test("rejects fabricated citations that do not appear in the verses", async () => {
  const fabricatedExpectation = await assessPunchline(
    request({
      generator: generatorWith({
        ...PREPARED_OUTPUT,
        expectationEvidence: ["una promesa inventada"],
      }),
    }),
  );

  assert.equal(fabricatedExpectation.ok, false);
  if (!fabricatedExpectation.ok) {
    assert.equal(fabricatedExpectation.error.code, "CITATION_NOT_IN_VERSE");
    assert.equal(fabricatedExpectation.error.expectedScope, "V1_V3");
    assert.equal(fabricatedExpectation.error.fragment, "una promesa inventada");
  }

  const fabricatedResolution = await assessPunchline(
    request({
      generator: generatorWith({
        ...PREPARED_OUTPUT,
        resolutionEvidence: "un giro inexistente",
      }),
    }),
  );

  assert.equal(fabricatedResolution.ok, false);
  if (!fabricatedResolution.ok) {
    assert.equal(fabricatedResolution.error.code, "CITATION_NOT_IN_VERSE");
    assert.equal(fabricatedResolution.error.expectedScope, "V4");
    assert.equal(fabricatedResolution.error.fragment, "un giro inexistente");
  }
});

test("rejects output that smuggles humor into the punchline assessment", async () => {
  const result = await assessPunchline(
    request({
      generator: generatorWith({ ...PREPARED_OUTPUT, humor: 5 }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

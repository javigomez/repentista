import test from "node:test";
import assert from "node:assert/strict";

import {
  detectRipio,
  RIPIO_DETECTOR_VERSION,
  RIPIO_FILLER_PATTERN_ID,
  RIPIO_MORPHOLOGICAL_PATTERN_ID,
  RIPIO_PATTERN_CATALOG_VERSION,
  type RipioDetectionRequest,
  type RipioVerse,
} from "./ripio-detection/index.js";
import {
  createGenerationBrief,
  createQuatrainCandidate,
  transitionQuatrainCandidate,
  type QuatrainCandidate,
} from "../domain/index.js";
import { FixtureStructuredLlmGenerator } from "../testing/structured-llm-generation-fake.js";
import type { StructuredLlmGenerationPort } from "../ports/structured-llm-generation/index.js";

const NATURAL_VERSES: readonly RipioVerse[] = [
  { slot: "V1", text: "El gato promete compartir la merienda." },
  { slot: "V2", text: "Guardó el melón para su buen vecino." },
  { slot: "V3", text: "Se distrajo con hambre en el camino." },
  { slot: "V4", text: "Y al final compartió solo el olor del jamón." },
];

const FILLER_VERSES: readonly RipioVerse[] = [
  { slot: "V1", text: "El gato promete compartir la merienda." },
  { slot: "V2", text: "Guardó el melón para su buen vecino." },
  { slot: "V3", text: "Y es que el hambre le quitó el camino." },
  { slot: "V4", text: "Y al final compartió solo el olor del jamón." },
];

const CAUSALITY_VERSES: readonly RipioVerse[] = [
  { slot: "V1", text: "El dragón reposa al sol en el prado." },
  { slot: "V2", text: "Un campesino lo mira sin cuidado." },
  { slot: "V3", text: "No se mueve ni siquiera un costado." },
  { slot: "V4", text: "porque era bastante cuadrado." },
];

const MORPHOLOGICAL_VERSES: readonly RipioVerse[] = [
  { slot: "V1", text: "El gato va cantando por la acera." },
  { slot: "V2", text: "Saltando y brincando a su manera." },
  { slot: "V3", text: "Va trotando sin ninguna espera." },
  { slot: "V4", text: "Y maullando llega a la ladera." },
];

const ABSURD_VERSES: readonly RipioVerse[] = [
  { slot: "V1", text: "El gato promete compartir la merienda." },
  { slot: "V2", text: "Un queso con sombrero toca la banda." },
  { slot: "V3", text: "La luna pidió azúcar a la pantera." },
  { slot: "V4", text: "Y el sol aplaudió desde la vereda." },
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
      operation: "detect-ripio",
      output,
      provider: "fixture-provider",
      model: "fixture-judge-v1",
      providerRequestId: "req-ripio-001",
      completedAt: "2026-08-31T15:00:00.000Z",
      durationMs: 42,
      usage: {
        inputTokens: 120,
        outputTokens: 40,
      },
    },
  ]);
}

function noRipioOutput() {
  return {
    severity: "NINGUNO",
    confidence: 0.97,
    explanation: "Cada verso cumple su función sin apoyarse en la rima.",
    fragments: [],
  };
}

function request(
  overrides: Partial<RipioDetectionRequest> = {},
): RipioDetectionRequest {
  return {
    candidate: validCandidate(),
    verses: NATURAL_VERSES,
    generator: generatorWith(noRipioOutput()),
    limits: { timeoutMs: 1_000, maxOutputTokens: 400 },
    ...overrides,
  };
}

test("returns a traced no-ripio result for an approved natural anchor", async () => {
  const result = await detectRipio(request());

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.presence, false);
  assert.equal(result.value.severity, "NINGUNO");
  assert.deepEqual(result.value.fragments, []);
  assert.deepEqual(result.value.signals, []);
  assert.equal(result.value.llm.severity, "NINGUNO");
  assert.equal(result.value.llm.confidence, 0.97);
  assert.equal(
    result.value.llm.explanation,
    "Cada verso cumple su función sin apoyarse en la rima.",
  );
  assert.equal(result.value.rubricVersion, RIPIO_DETECTOR_VERSION);
  assert.deepEqual(result.value.prompt, { id: "ripio-detection-rubric", version: "0.1.0" });
  assert.deepEqual(result.value.model, { provider: "fixture-provider", name: "fixture-judge-v1" });
  assert.equal(result.value.assessedAt, "2026-08-31T15:00:00.000Z");
  assert.equal(result.value.providerRequestId, "req-ripio-001");
});

test("flags obvious filler through a versioned deterministic pattern even when the model is silent", async () => {
  const result = await detectRipio(
    request({
      verses: FILLER_VERSES,
      generator: generatorWith(noRipioOutput()),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.presence, true);
  assert.equal(result.value.severity, "LEVE");
  assert.equal(result.value.signals.length, 1);
  assert.equal(result.value.signals[0].patternId, RIPIO_FILLER_PATTERN_ID);
  assert.equal(result.value.signals[0].patternVersion, RIPIO_PATTERN_CATALOG_VERSION);
  assert.equal(result.value.signals[0].slot, "V3");
  assert.equal(result.value.signals[0].fragment, "es que");
  assert.equal(result.value.signals[0].severity, "LEVE");
  assert.equal(result.value.fragments.length, 1);
  assert.equal(result.value.fragments[0].fragment, "es que");
});

test("marks forced causality through the LLM judgement and preserves the affected fragment", async () => {
  const result = await detectRipio(
    request({
      verses: CAUSALITY_VERSES,
      generator: generatorWith({
        severity: "MODERADO",
        confidence: 0.8,
        explanation: "La causalidad se inventa para cerrar la rima.",
        fragments: [
          {
            slot: "V4",
            fragment: "porque era bastante cuadrado",
            reason: "Relación causal sin sentido con el resto de la escena.",
          },
        ],
      }),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.presence, true);
  assert.equal(result.value.severity, "MODERADO");
  assert.equal(result.value.llm.severity, "MODERADO");
  assert.deepEqual(result.value.fragments, [
    {
      slot: "V4",
      fragment: "porque era bastante cuadrado",
      reason: "Relación causal sin sentido con el resto de la escena.",
    },
  ]);
});

test("flags morphological repetition through a versioned deterministic pattern", async () => {
  const result = await detectRipio(
    request({
      verses: MORPHOLOGICAL_VERSES,
      generator: generatorWith(noRipioOutput()),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.presence, true);
  assert.equal(result.value.severity, "LEVE");
  assert.equal(result.value.signals.length, 1);
  assert.equal(result.value.signals[0].patternId, RIPIO_MORPHOLOGICAL_PATTERN_ID);
  assert.equal(result.value.signals[0].patternVersion, RIPIO_PATTERN_CATALOG_VERSION);
  assert.equal(result.value.signals[0].slot, "V1");
  assert.equal(result.value.signals[0].fragment, "cantando");
});

test("keeps intentional absurdity as no-ripio when the model finds no filler", async () => {
  const result = await detectRipio(
    request({
      verses: ABSURD_VERSES,
      generator: generatorWith({
        severity: "NINGUNO",
        confidence: 0.9,
        explanation: "El absurdo es intencional y mantiene su lógica interna.",
        fragments: [],
      }),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.presence, false);
  assert.equal(result.value.severity, "NINGUNO");
  assert.deepEqual(result.value.signals, []);
  assert.equal(
    result.value.llm.explanation,
    "El absurdo es intencional y mantiene su lógica interna.",
  );
});

test("normalizes severity by taking the highest across LLM and deterministic sources", async () => {
  const result = await detectRipio(
    request({
      verses: FILLER_VERSES,
      generator: generatorWith({
        severity: "GRAVE",
        confidence: 0.6,
        explanation: "El relleno además rompe la escena.",
        fragments: [],
      }),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.presence, true);
  assert.equal(result.value.severity, "GRAVE");
  assert.equal(result.value.signals[0].severity, "LEVE");
});

test("rejects malformed LLM output through schema validation", async () => {
  const result = await detectRipio(
    request({
      generator: generatorWith({ severity: "CATASTROFICO", confidence: 2 }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

test("rejects citations that do not exist in the assessed verse", async () => {
  const result = await detectRipio(
    request({
      generator: generatorWith({
        severity: "MODERADO",
        confidence: 0.7,
        explanation: "Cita inventada.",
        fragments: [
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

test("does not run the detector when a hard blocker is present", async () => {
  const result = await detectRipio(
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
  const result = await detectRipio(
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

import test from "node:test";
import assert from "node:assert/strict";

import {
  assessHumor,
  HUMOR_RUBRIC_VERSION,
  type HumorAssessmentRequest,
  type HumorVerse,
} from "./humor-assessment/index.js";
import { createGenerationBrief } from "../domain/generation-brief/index.js";
import {
  createQuatrainCandidate,
  transitionQuatrainCandidate,
  type QuatrainCandidate,
} from "../domain/quatrain-candidate/index.js";
import { FixtureStructuredLlmGenerator } from "../testing/structured-llm-generation-fake.js";
import type { StructuredLlmGenerationPort } from "../ports/structured-llm-generation/index.js";

const SURPRISE_VERSES: readonly HumorVerse[] = [
  { slot: "V1", text: "El gato promete compartir la merienda." },
  { slot: "V2", text: "Guardó el melón para su buen vecino." },
  { slot: "V3", text: "Se distrajo con hambre en el camino." },
  { slot: "V4", text: "Y al final compartió solo el olor del jamón." },
];

const IMAGE_VERSES: readonly HumorVerse[] = [
  { slot: "V1", text: "El gato se puso el melón como casco." },
  { slot: "V2", text: "Y marchó muy serio a buscar su destajo." },
  { slot: "V3", text: "La fruta le goteaba por el bigote." },
  { slot: "V4", text: "Parecía un general con sombrero de copa." },
];

const ABSURD_VERSES: readonly HumorVerse[] = [
  { slot: "V1", text: "El melón le dio un consejo muy formal." },
  { slot: "V2", text: "Sobre cómo guardar el pan sin sal." },
  { slot: "V3", text: "El gato asintió con toda seriedad." },
  { slot: "V4", text: "Y el melón se marchó a dar clase en la aldea." },
];

const WORDPLAY_VERSES: readonly HumorVerse[] = [
  { slot: "V1", text: "El gato se sentó a leer el papel." },
  { slot: "V2", text: "Buscaba un remate que rimara con fiel." },
  { slot: "V3", text: "Mas solo halló la página en blanco fiel." },
  { slot: "V4", text: "Y por eso lo fía todo a la miel." },
];

const UNCLEAR_VERSES: readonly HumorVerse[] = [
  { slot: "V1", text: "El gato llevaba tres calcetines." },
  { slot: "V2", text: "Uno gris, otro azul y otro con lunares." },
  { slot: "V3", text: "Nadie sabía por qué los combinaba." },
  { slot: "V4", text: "Y la escena quedó sin explicación." },
];

const SURPRISE_OUTPUT = {
  note: 9,
  confidence: 0.9,
  mechanism: "SORPRESA",
  clarity: "CLARA",
  fragments: [
    {
      slot: "V4",
      fragment: "solo el olor del jamón",
      reason: "La promesa de compartir se resuelve compartiendo solo el olor, un giro inesperado.",
    },
  ],
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
      validator: "editorial-safety",
      version: "safety-0.1.0",
      reason: "El candidato contiene un término prohibido por la política editorial.",
      evidence: { pointer: "/validation/editorial-safety/V2", excerpt: "Guardó el melón" },
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected hard validation rejection to succeed");

  return result.value;
}

function generatorWith(output: unknown): StructuredLlmGenerationPort {
  return new FixtureStructuredLlmGenerator([
    {
      operation: "assess-humor",
      output,
      provider: "fixture-provider",
      model: "fixture-judge-v1",
      providerRequestId: "req-humor-001",
      completedAt: "2026-08-31T15:00:00.000Z",
      durationMs: 42,
      usage: {
        inputTokens: 140,
        outputTokens: 60,
      },
    },
  ]);
}

function request(overrides: Partial<HumorAssessmentRequest> = {}): HumorAssessmentRequest {
  return {
    candidate: validCandidate(),
    verses: SURPRISE_VERSES,
    generator: generatorWith(SURPRISE_OUTPUT),
    limits: { timeoutMs: 1_000, maxOutputTokens: 500 },
    ...overrides,
  };
}

test("returns a traced surprise assessment for a resolved anchor", async () => {
  const result = await assessHumor(request());

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.note, 9);
  assert.equal(result.value.confidence, 0.9);
  assert.equal(result.value.mechanism, "SORPRESA");
  assert.equal(result.value.clarity, "CLARA");
  assert.deepEqual(result.value.fragments, SURPRISE_OUTPUT.fragments);
  assert.equal(result.value.rubricVersion, HUMOR_RUBRIC_VERSION);
  assert.deepEqual(result.value.prompt, { id: "humor-rubric", version: "0.1.0" });
  assert.deepEqual(result.value.model, { provider: "fixture-provider", name: "fixture-judge-v1" });
  assert.equal(result.value.assessedAt, "2026-08-31T15:00:00.000Z");
  assert.equal(result.value.providerRequestId, "req-humor-001");
});

test("values a clear comic image without demanding a punchline", async () => {
  const result = await assessHumor(
    request({
      verses: IMAGE_VERSES,
      generator: generatorWith({
        note: 8,
        confidence: 0.85,
        mechanism: "IMAGEN",
        clarity: "CLARA",
        fragments: [
          {
            slot: "V1",
            fragment: "el melón como casco",
            reason: "La imagen de un gato con melón de casco es concreta y cómica.",
          },
        ],
      }),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.note, 8);
  assert.equal(result.value.mechanism, "IMAGEN");
  assert.equal(result.value.clarity, "CLARA");
});

test("values an accessible absurd situation treated as normal", async () => {
  const result = await assessHumor(
    request({
      verses: ABSURD_VERSES,
      generator: generatorWith({
        note: 9,
        confidence: 0.9,
        mechanism: "ABSURDO",
        clarity: "CLARA",
        fragments: [
          {
            slot: "V1",
            fragment: "El melón le dio un consejo",
            reason: "Un melón que da consejos es un absurdo tratado con normalidad.",
          },
        ],
      }),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.note, 9);
  assert.equal(result.value.mechanism, "ABSURDO");
  assert.equal(result.value.clarity, "CLARA");
});

test("values an accessible conceptual wordplay", async () => {
  const result = await assessHumor(
    request({
      verses: WORDPLAY_VERSES,
      generator: generatorWith({
        note: 7,
        confidence: 0.8,
        mechanism: "JUEGO_CONCEPTUAL",
        clarity: "CLARA",
        fragments: [
          {
            slot: "V4",
            fragment: "lo fía todo a la miel",
            reason: "El doble sentido de fiar/confiar se apoya en la homofonía con la rima.",
          },
        ],
      }),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.note, 7);
  assert.equal(result.value.mechanism, "JUEGO_CONCEPTUAL");
});

test("flags unclear oddity as ambiguous instead of rewarding it as humor", async () => {
  const result = await assessHumor(
    request({
      verses: UNCLEAR_VERSES,
      generator: generatorWith({
        note: 2,
        confidence: 0.7,
        mechanism: "ABSURDO",
        clarity: "AMBIGUA",
        fragments: [
          {
            slot: "V4",
            fragment: "sin explicación",
            reason: "La rareza de los calcetines no produce sorpresa ni imagen: queda confusa.",
          },
        ],
      }),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.note, 2);
  assert.equal(result.value.clarity, "AMBIGUA");
});

test("rejects a judge that claims humor without a localized mechanism", async () => {
  const result = await assessHumor(
    request({
      generator: generatorWith({
        note: 9,
        confidence: 0.9,
        mechanism: "SORPRESA",
        clarity: "CLARA",
        fragments: [],
      }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

test("does not run the evaluator when the candidate is blocked by safety", async () => {
  const result = await assessHumor(
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
  const result = await assessHumor(
    request({
      verses: SURPRISE_VERSES.filter((verse) => verse.slot !== "V4"),
      generator: new FixtureStructuredLlmGenerator([]),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "INCOMPLETE_VERSES");
  assert.deepEqual(result.error.missingSlots, ["V4"]);
});

test("rejects out-of-range notes through schema validation", async () => {
  const result = await assessHumor(
    request({
      generator: generatorWith({ ...SURPRISE_OUTPUT, note: 11 }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

test("rejects malformed LLM output through schema validation", async () => {
  const result = await assessHumor(
    request({
      generator: generatorWith({ note: "nueve", confidence: "alta" }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

test("rejects an unknown mechanism or clarity label", async () => {
  const badMechanism = await assessHumor(
    request({
      generator: generatorWith({ ...SURPRISE_OUTPUT, mechanism: "CHISTE_MALO" }),
    }),
  );

  assert.equal(badMechanism.ok, false);
  if (!badMechanism.ok) {
    assert.equal(badMechanism.error.code, "LLM_ASSESSMENT_FAILED");
    assert.equal(badMechanism.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
  }

  const badClarity = await assessHumor(
    request({
      generator: generatorWith({ ...SURPRISE_OUTPUT, clarity: "OSCURA" }),
    }),
  );

  assert.equal(badClarity.ok, false);
  if (!badClarity.ok) {
    assert.equal(badClarity.error.code, "LLM_ASSESSMENT_FAILED");
    assert.equal(badClarity.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
  }
});

test("rejects fabricated citations that do not appear in the verses", async () => {
  const result = await assessHumor(
    request({
      generator: generatorWith({
        ...SURPRISE_OUTPUT,
        fragments: [
          {
            slot: "V4",
            fragment: "un olor que no existe",
            reason: "Cita inventada para justificar una nota alta.",
          },
        ],
      }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "CITATION_NOT_IN_VERSE");
  assert.equal(result.error.slot, "V4");
  assert.equal(result.error.fragment, "un olor que no existe");
});

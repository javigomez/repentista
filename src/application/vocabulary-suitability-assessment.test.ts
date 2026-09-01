import test from "node:test";
import assert from "node:assert/strict";

import {
  assessVocabularySuitability,
  VOCABULARY_SUITABILITY_RUBRIC_VERSION,
  type VocabularySuitabilityAssessmentRequest,
  type VocabularySuitabilityVerse,
} from "./vocabulary-suitability-assessment/index.js";
import {
  createGenerationBrief,
  createQuatrainCandidate,
  transitionQuatrainCandidate,
  type QuatrainCandidate,
} from "../domain/index.js";
import { FixtureStructuredLlmGenerator } from "../testing/structured-llm-generation-fake.js";
import type { StructuredLlmGenerationPort } from "../ports/structured-llm-generation/index.js";
import {
  createVocabularyDictionary,
  VOCABULARY_GOLD_FIXTURES,
  VOCABULARY_GOLD_VERSION,
} from "./vocabulary-suitability-assessment/vocabulary-suitability-fixtures.js";

const EVERYDAY_VERSES: readonly VocabularySuitabilityVerse[] = [
  { slot: "V1", text: "El gato reparte su merienda por el balcón." },
  { slot: "V2", text: "Guarda un melón para su vecino más leal." },
  { slot: "V3", text: "Nadie se queda sin un trozo del pastel." },
  { slot: "V4", text: "Y comparte con todos su pan y su alegría." },
];

const EVERYDAY_OUTPUT = {
  note: 9,
  confidence: 0.95,
  flaggedWords: [],
};

const CULTURED_OUTPUT = {
  note: 3,
  confidence: 0.8,
  flaggedWords: [
    {
      slot: "V3",
      form: "inefable",
      issue: "DEMASIADO_CULTO",
      reason: "El adjetivo es inaccesible para lectores de 10-12 años en este uso concreto.",
      alternatives: ["increíble", "sorprendente"],
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
          plannedFinalWord: "balcón",
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
          semanticAnchor: "nadie se queda sin postre",
          plannedFinalWord: "pastel",
        },
        {
          slot: "V4",
          role: "REMATE",
          semanticAnchor: "comparte su pan y su alegría",
          plannedFinalWord: "alegría",
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
      {
        validator: "lexicon",
        version: "lexicon-0.1.0",
        result: "VALIDO",
        evidence: { pointer: "/validation/lexicon" },
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
      validator: "approved-lexicon",
      version: "lexicon-0.1.0",
      reason: "El candidato usa una palabra controlada ausente del diccionario aprobado.",
      evidence: { pointer: "/validation/lexicon/V2", excerpt: "Guarda un melón" },
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected hard validation rejection to succeed");

  return result.value;
}

function generatorWith(output: unknown): StructuredLlmGenerationPort {
  return new FixtureStructuredLlmGenerator([
    {
      operation: "assess-vocabulary-suitability",
      output,
      provider: "fixture-provider",
      model: "fixture-judge-v1",
      providerRequestId: "req-vocab-001",
      completedAt: "2026-08-31T15:00:00.000Z",
      durationMs: 42,
      usage: {
        inputTokens: 140,
        outputTokens: 60,
      },
    },
  ]);
}

function request(overrides: Partial<VocabularySuitabilityAssessmentRequest> = {}): VocabularySuitabilityAssessmentRequest {
  return {
    candidate: validCandidate(),
    verses: EVERYDAY_VERSES,
    dictionary: createVocabularyDictionary(
      VOCABULARY_GOLD_FIXTURES.find((fixture) => fixture.id === "clear_everyday_vocabulary")
        ?.dictionary ?? [],
    ),
    dictionaryVersion: VOCABULARY_GOLD_VERSION,
    generator: generatorWith(EVERYDAY_OUTPUT),
    limits: { timeoutMs: 1_000, maxOutputTokens: 500 },
    ...overrides,
  };
}

for (const fixture of VOCABULARY_GOLD_FIXTURES) {
  test(`audience-level fixture: ${fixture.description}`, async () => {
    const result = await assessVocabularySuitability(
      request({
        verses: fixture.verses,
        dictionary: createVocabularyDictionary(fixture.dictionary),
        generator: generatorWith(fixture.judge),
      }),
    );

    assert.equal(result.ok, true);
    if (!result.ok) return;

    assert.equal(result.value.note, fixture.expectedNote);
    assert.deepEqual(
      result.value.flaggedWords.map((flaggedWord) => flaggedWord.issue),
      fixture.expectedIssues,
    );
    assert.deepEqual(
      result.value.wordMetadata.map((metadata) => metadata.form),
      fixture.expectedMetadataForms,
    );
    assert.equal(result.value.dictionaryVersion, VOCABULARY_GOLD_VERSION);
    assert.equal(result.value.rubricVersion, VOCABULARY_SUITABILITY_RUBRIC_VERSION);
  });
}

test("returns a traced assessment with separate data and judgment sources", async () => {
  const result = await assessVocabularySuitability(request());

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.note, 9);
  assert.equal(result.value.confidence, 0.95);
  assert.deepEqual(result.value.flaggedWords, []);
  assert.equal(result.value.rubricVersion, VOCABULARY_SUITABILITY_RUBRIC_VERSION);
  assert.deepEqual(result.value.prompt, {
    id: "vocabulary-suitability-rubric",
    version: "0.1.0",
  });
  assert.deepEqual(result.value.model, { provider: "fixture-provider", name: "fixture-judge-v1" });
  assert.equal(result.value.assessedAt, "2026-08-31T15:00:00.000Z");
  assert.equal(result.value.providerRequestId, "req-vocab-001");
});

test("keeps a dictionary-approved word flagged as a soft problem, not as absence", async () => {
  const culturedFixture = VOCABULARY_GOLD_FIXTURES.find(
    (fixture) => fixture.id === "overly_cultured_word",
  );

  assert.ok(culturedFixture);

  const result = await assessVocabularySuitability(
    request({
      verses: culturedFixture.verses,
      dictionary: createVocabularyDictionary(culturedFixture.dictionary),
      generator: generatorWith(culturedFixture.judge),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const metadata = result.value.wordMetadata.find((entry) => entry.form === "inefable");
  const flagged = result.value.flaggedWords.find((word) => word.form === "inefable");

  assert.ok(metadata, "the dictionary metadata must still list the approved word");
  assert.equal(metadata.dictionaryLevel, "culto");
  assert.equal(metadata.normalizedForm, "inefable");
  assert.ok(flagged, "the LLM judgment must still flag the word as too cultured");
  assert.equal(flagged.issue, "DEMASIADO_CULTO");
  assert.deepEqual(flagged.alternatives, ["increíble", "sorprendente"]);
});

test("does not run the evaluator when the lexical validator already failed", async () => {
  const result = await assessVocabularySuitability(
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
  const result = await assessVocabularySuitability(
    request({
      verses: EVERYDAY_VERSES.filter((verse) => verse.slot !== "V4"),
      generator: new FixtureStructuredLlmGenerator([]),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "INCOMPLETE_VERSES");
  assert.deepEqual(result.error.missingSlots, ["V4"]);
});

test("rejects out-of-range notes through schema validation", async () => {
  const result = await assessVocabularySuitability(
    request({
      generator: generatorWith({ ...EVERYDAY_OUTPUT, note: 11 }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

test("rejects malformed LLM output through schema validation", async () => {
  const result = await assessVocabularySuitability(
    request({
      generator: generatorWith({ note: "nueve", confidence: "alta" }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

test("rejects an unknown vocabulary issue label", async () => {
  const result = await assessVocabularySuitability(
    request({
      generator: generatorWith({
        ...CULTURED_OUTPUT,
        flaggedWords: [
          {
            slot: "V3",
            form: "inefable",
            issue: "RARO",
            reason: "motivo inventado",
            alternatives: ["claro"],
          },
        ],
      }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

test("rejects a flagged word that does not appear in the cited verse", async () => {
  const result = await assessVocabularySuitability(
    request({
      generator: generatorWith({
        ...CULTURED_OUTPUT,
        flaggedWords: [
          {
            slot: "V3",
            form: "inefable",
            issue: "DEMASIADO_CULTO",
            reason: "motivo",
            alternatives: ["claro"],
          },
        ],
      }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "CITATION_NOT_IN_VERSE");
  assert.equal(result.error.slot, "V3");
  assert.equal(result.error.form, "inefable");
});

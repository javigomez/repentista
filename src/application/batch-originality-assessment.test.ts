import test from "node:test";
import assert from "node:assert/strict";

import {
  BATCH_ORIGINALITY_NOTE_MAXIMUM,
  BATCH_ORIGINALITY_RUBRIC_VERSION,
  BATCH_ORIGINALITY_SCOPE,
  assessBatchOriginality,
  type BatchOriginalityRequest,
} from "./batch-originality-assessment/index.js";
import {
  DISTINCT_BATCH,
  SUPERFICIAL_VARIATION_BATCH,
  gatoCandidate,
} from "./batch-originality-assessment/batch-originality-assessment-fixtures.js";
import { FixtureStructuredLlmGenerator } from "../testing/structured-llm-generation-fake.js";
import type { StructuredLlmGenerationPort } from "../ports/structured-llm-generation/index.js";

function generatorWith(output: unknown): StructuredLlmGenerationPort {
  return new FixtureStructuredLlmGenerator([
    {
      operation: "assess-batch-originality",
      output,
      provider: "fixture-provider",
      model: "fixture-judge-v1",
      providerRequestId: "req-originality-001",
      completedAt: "2026-08-31T16:00:00.000Z",
      durationMs: 41,
      usage: {
        inputTokens: 140,
        outputTokens: 30,
      },
    },
  ]);
}

function request(
  overrides: Partial<BatchOriginalityRequest> = {},
): BatchOriginalityRequest {
  return {
    batchId: "batch-001",
    candidates: SUPERFICIAL_VARIATION_BATCH,
    generator: generatorWith({ relationships: [] }),
    limits: { timeoutMs: 1_000, maxOutputTokens: 400 },
    ...overrides,
  };
}

test("a clearly distinct candidate earns a favourable note with its distinctive features", async () => {
  const result = await assessBatchOriginality(
    request({
      candidates: DISTINCT_BATCH,
      generator: new FixtureStructuredLlmGenerator([]),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.totalCandidates, 3);

  const first = result.value.results.find((item) => item.candidateId === "candidate-a");
  assert.ok(first, "expected a result for candidate-a");
  assert.equal(first.note, BATCH_ORIGINALITY_NOTE_MAXIMUM);
  assert.deepEqual(first.similarCandidates, []);
  assert.deepEqual(first.distinctiveFeatures, [
    "pareja de rima: melón-jamón",
    "presenta al gato",
    "promete guardar pan",
    "se distrae",
    "confiesa el remate",
  ]);
});

test("links a superficial variation to its neighbour and reduces its originality", async () => {
  const result = await assessBatchOriginality(
    request({
      generator: generatorWith({
        relationships: [
          {
            sourceId: "candidate-a",
            targetId: "candidate-b",
            similarity: 0.85,
            sharedFeatures: ["misma imagen del gato", "mismo mecanismo de remate"],
          },
        ],
      }),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const varied = result.value.results.find((item) => item.candidateId === "candidate-a");
  assert.ok(varied, "expected a result for candidate-a");
  assert.equal(varied.note, 3);
  assert.deepEqual(varied.distinctiveFeatures, []);
  assert.deepEqual(varied.similarCandidates, [
    {
      candidateId: "candidate-b",
      sharedFeatures: ["misma imagen del gato", "mismo mecanismo de remate"],
    },
  ]);

  const neighbour = result.value.results.find((item) => item.candidateId === "candidate-b");
  assert.ok(neighbour, "expected a result for candidate-b");
  assert.equal(neighbour.note, 3);
  assert.deepEqual(neighbour.similarCandidates, [
    {
      candidateId: "candidate-a",
      sharedFeatures: ["misma imagen del gato", "mismo mecanismo de remate"],
    },
  ]);

  const distinct = result.value.results.find((item) => item.candidateId === "candidate-c");
  assert.ok(distinct, "expected a result for candidate-c");
  assert.equal(distinct.note, BATCH_ORIGINALITY_NOTE_MAXIMUM);
  assert.deepEqual(distinct.similarCandidates, []);
});

test("declares batch scope and never asserts global novelty", async () => {
  const result = await assessBatchOriginality(
    request({
      candidates: DISTINCT_BATCH,
      generator: new FixtureStructuredLlmGenerator([]),
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.batchId, "batch-001");
  assert.equal(result.value.scope, BATCH_ORIGINALITY_SCOPE);
  assert.equal(result.value.rubricVersion, BATCH_ORIGINALITY_RUBRIC_VERSION);

  const serialized = JSON.parse(JSON.stringify(result.value)) as Record<string, unknown>;
  assert.equal("globalNovelty" in serialized, false);
});

test("preserves input order and produces stable results across repeated runs", async () => {
  const candidates = SUPERFICIAL_VARIATION_BATCH;
  const generator = generatorWith({
    relationships: [
      {
        sourceId: "candidate-a",
        targetId: "candidate-b",
        similarity: 0.5,
        sharedFeatures: ["mismo personaje"],
      },
    ],
  });

  const first = await assessBatchOriginality(
    request({ candidates, generator }),
  );
  const second = await assessBatchOriginality(
    request({ candidates, generator: generatorWith({
      relationships: [
        {
          sourceId: "candidate-a",
          targetId: "candidate-b",
          similarity: 0.5,
          sharedFeatures: ["mismo personaje"],
        },
      ],
    }) }),
  );

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!first.ok || !second.ok) return;

  assert.deepEqual(
    first.value.results.map((item) => item.candidateId),
    ["candidate-a", "candidate-b", "candidate-c"],
  );
  assert.deepEqual(first.value, second.value);
});

test("never consults the model when every structured feature is distinct", async () => {
  const generator = new FixtureStructuredLlmGenerator([]);

  const result = await assessBatchOriginality(
    request({ candidates: DISTINCT_BATCH, generator }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(
    result.value.results.map((item) => item.note),
    [BATCH_ORIGINALITY_NOTE_MAXIMUM, BATCH_ORIGINALITY_NOTE_MAXIMUM, BATCH_ORIGINALITY_NOTE_MAXIMUM],
  );
});

test("rejects a batch with a duplicated candidate id before calling the model", async () => {
  const result = await assessBatchOriginality(
    request({
      candidates: [gatoCandidate({ id: "dup" }), gatoCandidate({ id: "dup" })],
      generator: new FixtureStructuredLlmGenerator([]),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "DUPLICATE_CANDIDATE_ID");
  assert.equal(result.error.candidateId, "dup");
});

test("rejects a candidate missing a verse before calling the model", async () => {
  const result = await assessBatchOriginality(
    request({
      candidates: [
        gatoCandidate({
          id: "candidate-a",
          verses: ["Un gato mira al vecino"],
        }),
      ],
      generator: new FixtureStructuredLlmGenerator([]),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "INCOMPLETE_CANDIDATE");
  assert.equal(result.error.candidateId, "candidate-a");
  assert.equal(result.error.field, "verses");
  assert.equal(result.error.expected, 4);
  assert.equal(result.error.received, 1);
});

test("surfaces a provider failure as a batch originality failure", async () => {
  const generator = new FixtureStructuredLlmGenerator([
    {
      operation: "assess-batch-originality",
      provider: "fixture-provider",
      model: "fixture-judge-v1",
      providerRequestId: "req-originality-002",
      completedAt: "2026-08-31T16:01:00.000Z",
      durationMs: 10,
      error: { code: "TIMEOUT", message: "slow judge", retryable: true },
    },
  ]);

  const result = await assessBatchOriginality(request({ generator }));

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_ASSESSMENT_FAILED");
  assert.equal(result.error.cause.code, "TIMEOUT");
});

test("rejects a relationship that references a candidate outside the batch", async () => {
  const result = await assessBatchOriginality(
    request({
      generator: generatorWith({
        relationships: [
          {
            sourceId: "candidate-a",
            targetId: "candidate-unknown",
            similarity: 0.9,
            sharedFeatures: ["misma imagen"],
          },
        ],
      }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "RELATIONSHIP_REFERENCES_UNKNOWN_CANDIDATE");
  assert.equal(result.error.candidateId, "candidate-unknown");
});

test("rejects malformed model output through schema validation", async () => {
  const result = await assessBatchOriginality(
    request({
      generator: generatorWith({
        relationships: [
          {
            sourceId: "candidate-a",
            targetId: "candidate-b",
            similarity: "alta",
            sharedFeatures: ["misma imagen"],
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

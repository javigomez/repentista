import test from "node:test";
import assert from "node:assert/strict";

import type {
  StructuredLlmGenerationRequest,
  StructuredLlmOutputSchema,
} from "./structured-llm-generation/index.js";
import { FixtureStructuredLlmGenerator } from "../testing/structured-llm-generation-fake.js";

interface SemanticOutline {
  readonly finalConcept: string;
  readonly verses: readonly [
    { readonly slot: "V1"; readonly role: "presentacion" },
    { readonly slot: "V2"; readonly role: "preparacion" },
    { readonly slot: "V3"; readonly role: "giro_tension" },
    { readonly slot: "V4"; readonly role: "remate" },
  ];
}

const validOutline: SemanticOutline = Object.freeze({
  finalConcept: "Un dragon confunde el humo con perfume",
  verses: Object.freeze([
    Object.freeze({ slot: "V1", role: "presentacion" }),
    Object.freeze({ slot: "V2", role: "preparacion" }),
    Object.freeze({ slot: "V3", role: "giro_tension" }),
    Object.freeze({ slot: "V4", role: "remate" }),
  ]),
});

const semanticOutlineSchema: StructuredLlmOutputSchema<SemanticOutline> = Object.freeze({
  name: "semantic-outline",
  version: "0.1.0",
  validate(value: unknown) {
    if (!isRecord(value)) {
      return {
        ok: false as const,
        issues: [{ path: "$", message: "Expected an object." }],
      };
    }

    if (typeof value.finalConcept !== "string" || value.finalConcept.trim().length === 0) {
      return {
        ok: false as const,
        issues: [{ path: "$.finalConcept", message: "Expected a non-empty string." }],
      };
    }

    if (!Array.isArray(value.verses) || value.verses.length !== 4) {
      return {
        ok: false as const,
        issues: [{ path: "$.verses", message: "Expected exactly four verse roles." }],
      };
    }

    return { ok: true as const, value: value as SemanticOutline };
  },
});

const baseRequest = (): StructuredLlmGenerationRequest<SemanticOutline> => ({
  operation: "plan-semantic-outline",
  prompt: {
    id: "planner.semantic-outline",
    version: "0.1.0",
    messages: [
      { role: "system", content: "Devuelve solo un plan JSON validable." },
      { role: "user", content: "Tema: dragones despistados." },
    ],
  },
  input: Object.freeze({
    context: "dragones despistados",
    candidateCount: 3,
  }),
  outputSchema: semanticOutlineSchema,
  limits: {
    timeoutMs: 1_000,
    maxOutputTokens: 600,
  },
});

test("returns schema-valid data with normalized provenance and usage", async () => {
  const generator = new FixtureStructuredLlmGenerator([
    {
      operation: "plan-semantic-outline",
      output: validOutline,
      provider: "fixture-provider",
      model: "fixture-structured-v1",
      providerRequestId: "fixture-request-1",
      completedAt: "2026-08-30T10:00:00.000Z",
      durationMs: 23,
      usage: {
        inputTokens: 41,
        outputTokens: 67,
      },
    },
  ]);

  const result = await generator.generate(baseRequest());

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.value.data, validOutline);
  assert.deepEqual(result.value.provenance, {
    provider: "fixture-provider",
    model: "fixture-structured-v1",
    operation: "plan-semantic-outline",
    prompt: {
      id: "planner.semantic-outline",
      version: "0.1.0",
    },
    requestId: "fixture-request-1",
    completedAt: "2026-08-30T10:00:00.000Z",
    durationMs: 23,
  });
  assert.deepEqual(result.value.usage, {
    inputTokens: 41,
    outputTokens: 67,
    totalTokens: 108,
  });
});

test("rejects invalid structured output without returning partial data", async () => {
  const generator = new FixtureStructuredLlmGenerator([
    {
      operation: "plan-semantic-outline",
      output: {
        finalConcept: "Un dragon confunde el humo con perfume",
        verses: [{ slot: "V4", role: "remate" }],
      },
      provider: "fixture-provider",
      model: "fixture-structured-v1",
      providerRequestId: "fixture-request-2",
      completedAt: "2026-08-30T10:00:01.000Z",
      durationMs: 19,
      usage: {
        inputTokens: 38,
        outputTokens: 12,
      },
    },
  ]);

  const result = await generator.generate(baseRequest());

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "INVALID_STRUCTURED_OUTPUT");
  assert.equal(result.error.retryable, false);
  assert.deepEqual(result.error.validationIssues, [
    { path: "$.verses", message: "Expected exactly four verse roles." },
  ]);
  assert.deepEqual(result.error.provenance, {
    provider: "fixture-provider",
    model: "fixture-structured-v1",
    operation: "plan-semantic-outline",
    prompt: {
      id: "planner.semantic-outline",
      version: "0.1.0",
    },
    requestId: "fixture-request-2",
    completedAt: "2026-08-30T10:00:01.000Z",
    durationMs: 19,
  });
  assert.equal("value" in result, false);
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

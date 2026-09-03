import test from "node:test";
import assert from "node:assert/strict";

import type {
  StructuredLlmGenerationRequest,
  StructuredLlmOutputSchema,
} from "../../ports/structured-llm-generation/index.js";
import { createOpenAiResponsesAdapter } from "./index.js";

/**
 * Live contract test for the OpenAI Responses adapter.
 *
 * This test only runs when:
 * 1. OPENAI_API_KEY environment variable is set
 * 2. RUN_LIVE_CONTRACT_TESTS=true
 *
 * It verifies the adapter works with the real OpenAI API.
 * This test NEVER runs in the default offline test suite.
 */
const apiKey = process.env.OPENAI_API_KEY;
const shouldRunLive = process.env.RUN_LIVE_CONTRACT_TESTS === "true" && apiKey;

const testFn = shouldRunLive ? test : test.skip;

interface SemanticOutline {
  readonly finalConcept: string;
  readonly verses: readonly [
    { readonly slot: "V1"; readonly role: "presentacion" },
    { readonly slot: "V2"; readonly role: "preparacion" },
    { readonly slot: "V3"; readonly role: "giro_tension" },
    { readonly slot: "V4"; readonly role: "remate" },
  ];
}

const semanticOutlineSchema: StructuredLlmOutputSchema<SemanticOutline> = {
  name: "semantic-outline",
  version: "0.1.0",
  validate(value: unknown) {
    if (typeof value !== "object" || value === null) {
      return {
        ok: false as const,
        issues: [{ path: "$", message: "Expected an object." }],
      };
    }
    const obj = value as Record<string, unknown>;
    if (
      typeof obj.finalConcept !== "string" ||
      obj.finalConcept.trim().length === 0
    ) {
      return {
        ok: false as const,
        issues: [
          { path: "$.finalConcept", message: "Expected a non-empty string." },
        ],
      };
    }
    if (!Array.isArray(obj.verses) || obj.verses.length !== 4) {
      return {
        ok: false as const,
        issues: [
          { path: "$.verses", message: "Expected exactly four verse roles." },
        ],
      };
    }
    return {
      ok: true as const,
      value: value as SemanticOutline,
    };
  },
};

const baseRequest = (): StructuredLlmGenerationRequest<SemanticOutline> => ({
  operation: "plan-semantic-outline",
  prompt: {
    id: "planner.semantic-outline",
    version: "0.1.0",
    messages: [
      {
        role: "system",
        content:
          "Devuelve solo un plan JSON validable con exactamente 4 versos. " +
          "Cada verso debe tener slot (V1-V4) y role (presentacion, preparacion, giro_tension, remate).",
      },
      {
        role: "user",
        content:
          "Tema: dragones despistados que confunden el humo con perfume.",
      },
    ],
  },
  input: { context: "dragones despistados", candidateCount: 1 },
  outputSchema: semanticOutlineSchema,
  limits: {
    timeoutMs: 30_000,
    maxOutputTokens: 600,
  },
});

testFn(
  "live: completes a structured generation with real OpenAI API",
  async () => {
    const adapter = createOpenAiResponsesAdapter({
      apiKey: apiKey!,
      model: "gpt-4o-2024-08-06",
    });

    const result = await adapter.generate(baseRequest());

    assert.equal(result.ok, true);
    if (!result.ok) {
      // Use a type assertion to access error properties after assert.fail
      const errorResult = result as {
        ok: false;
        error: { code: string; message: string };
      };
      assert.fail(
        `Expected success but got error: ${errorResult.error.code} - ${errorResult.error.message}`,
      );
    }

    // Verify data structure
    assert.equal(typeof result.value.data.finalConcept, "string");
    assert.ok(
      result.value.data.finalConcept.length > 0,
      "finalConcept should not be empty",
    );
    assert.equal(result.value.data.verses.length, 4);

    // Verify provenance
    assert.equal(result.value.provenance.provider, "openai");
    assert.equal(result.value.provenance.model, "gpt-4o-2024-08-06");
    assert.equal(result.value.provenance.operation, "plan-semantic-outline");
    assert.equal(result.value.provenance.prompt.id, "planner.semantic-outline");
    assert.equal(typeof result.value.provenance.requestId, "string");
    assert.equal(typeof result.value.provenance.completedAt, "string");
    assert.equal(typeof result.value.provenance.durationMs, "number");
    assert.ok(
      result.value.provenance.durationMs > 0,
      "durationMs should be positive",
    );

    // Verify usage
    assert.equal(typeof result.value.usage.inputTokens, "number");
    assert.equal(typeof result.value.usage.outputTokens, "number");
    assert.equal(
      result.value.usage.totalTokens,
      result.value.usage.inputTokens + result.value.usage.outputTokens,
    );
    assert.ok(
      result.value.usage.inputTokens > 0,
      "inputTokens should be positive",
    );
    assert.ok(
      result.value.usage.outputTokens > 0,
      "outputTokens should be positive",
    );

    // Verify no secrets in output
    const outputJson = JSON.stringify(result.value);
    assert.ok(
      !outputJson.includes(apiKey!),
      "Output must not contain the API key.",
    );
  },
);

testFn("live: never runs without explicit opt-in", async () => {
  // This test verifies the guard logic works
  assert.ok(
    process.env.RUN_LIVE_CONTRACT_TESTS === "true",
    "Live tests should only run with explicit opt-in.",
  );
  assert.ok(
    process.env.OPENAI_API_KEY !== undefined,
    "Live tests should only run with API key.",
  );
});

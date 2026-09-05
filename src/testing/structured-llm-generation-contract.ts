import test from "node:test";
import assert from "node:assert/strict";

import type {
  StructuredLlmGenerationPort,
  StructuredLlmGenerationRequest,
  StructuredLlmOutputSchema,
} from "../ports/structured-llm-generation/index.js";

/**
 * Semantic outline used as the canonical valid output for contract tests.
 * Matches the shape expected by the planner pipeline stage.
 */
export interface SemanticOutline {
  readonly finalConcept: string;
  readonly verses: readonly [
    { readonly slot: "V1"; readonly role: "presentacion" },
    { readonly slot: "V2"; readonly role: "preparacion" },
    { readonly slot: "V3"; readonly role: "giro_tension" },
    { readonly slot: "V4"; readonly role: "remate" },
  ];
}

export const validSemanticOutline: SemanticOutline = Object.freeze({
  finalConcept: "Un dragon confunde el humo con perfume",
  verses: [
    { slot: "V1", role: "presentacion" },
    { slot: "V2", role: "preparacion" },
    { slot: "V3", role: "giro_tension" },
    { slot: "V4", role: "remate" },
  ] as const,
});

export const semanticOutlineSchema: StructuredLlmOutputSchema<SemanticOutline> =
  Object.freeze({
    name: "semantic-outline",
    version: "0.1.0",
    validate(value: unknown) {
      if (!isRecord(value)) {
        return {
          ok: false as const,
          issues: [{ path: "$", message: "Expected an object." }],
        };
      }

      if (
        typeof value.finalConcept !== "string" ||
        value.finalConcept.trim().length === 0
      ) {
        return {
          ok: false as const,
          issues: [
            {
              path: "$.finalConcept",
              message: "Expected a non-empty string.",
            },
          ],
        };
      }

      if (!Array.isArray(value.verses) || value.verses.length !== 4) {
        return {
          ok: false as const,
          issues: [
            {
              path: "$.verses",
              message: "Expected exactly four verse roles.",
            },
          ],
        };
      }

      return { ok: true as const, value: value as unknown as SemanticOutline };
    },
  });

/**
 * Factory function type that creates a port instance for a specific test scenario.
 * Implementations control the behavior of the returned port to simulate provider responses.
 */
export type StructuredLlmPortFactory = () => StructuredLlmGenerationPort;

/**
 * Registers shared contract tests that any StructuredLlmGenerationPort implementation must satisfy.
 *
 * The factory function is called once per test and should return a port instance
 * configured to exhibit the behavior being tested. For the "valid output" scenario,
 * the port must return data matching validSemanticOutline. For the "incomplete response"
 * scenario, the port must return a CONTENT_REJECTED or PROVIDER_UNAVAILABLE error.
 * For the "invalid schema" scenario, the port must return data that fails semanticOutlineSchema validation.
 *
 * @param describeLabel - Label for the top-level describe block (e.g., "OpenAI Responses adapter")
 * @param validOutputFactory - Factory producing a port that returns valid structured output
 * @param incompleteResponseFactory - Factory producing a port that returns an incomplete/refused response
 * @param invalidSchemaFactory - Factory producing a port that returns schema-invalid data
 */
export function registerStructuredLlmGenerationContractTests(
  describeLabel: string,
  validOutputFactory: StructuredLlmPortFactory,
  incompleteResponseFactory: StructuredLlmPortFactory,
  invalidSchemaFactory: StructuredLlmPortFactory,
): void {
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

  test(`${describeLabel}: returns schema-valid data with normalized provenance and usage`, async () => {
    const port = validOutputFactory();
    const result = await port.generate(baseRequest());

    if (!result.ok) {
      assert.fail(
        `Expected successful result but got error: ${result.error.code} - ${result.error.message}`,
      );
    }

    assert.deepEqual(result.value.data, validSemanticOutline);
    assert.equal(typeof result.value.provenance.provider, "string");
    assert.equal(typeof result.value.provenance.model, "string");
    assert.equal(result.value.provenance.operation, "plan-semantic-outline");
    assert.equal(result.value.provenance.prompt.id, "planner.semantic-outline");
    assert.equal(result.value.provenance.prompt.version, "0.1.0");
    assert.equal(typeof result.value.provenance.requestId, "string");
    assert.equal(typeof result.value.provenance.completedAt, "string");
    assert.equal(typeof result.value.provenance.durationMs, "number");
    assert.equal(typeof result.value.usage.inputTokens, "number");
    assert.equal(typeof result.value.usage.outputTokens, "number");
    assert.equal(
      result.value.usage.totalTokens,
      result.value.usage.inputTokens + result.value.usage.outputTokens,
    );
  });

  test(`${describeLabel}: rejects incomplete provider response without returning data`, async () => {
    const port = incompleteResponseFactory();
    const result = await port.generate(baseRequest());

    assert.equal(result.ok, false);
    if (result.ok) {
      assert.fail(
        "Expected error result for incomplete response but got success.",
      );
    }

    assert.ok(
      result.error.code === "CONTENT_REJECTED" ||
        result.error.code === "PROVIDER_UNAVAILABLE",
      `Expected CONTENT_REJECTED or PROVIDER_UNAVAILABLE but got ${result.error.code}`,
    );
    assert.equal(typeof result.error.message, "string");
    assert.equal(typeof result.error.retryable, "boolean");
    assert.equal("validationIssues" in result.error, false);
    assert.equal("value" in result, false);
  });

  test(`${describeLabel}: rejects schema-invalid output without returning partial data`, async () => {
    const port = invalidSchemaFactory();
    const result = await port.generate(baseRequest());

    assert.equal(result.ok, false);
    if (result.ok) {
      assert.fail("Expected error result for invalid schema but got success.");
    }

    assert.equal(result.error.code, "INVALID_STRUCTURED_OUTPUT");
    assert.equal(result.error.retryable, false);
    assert.ok(
      Array.isArray(result.error.validationIssues) &&
        result.error.validationIssues.length > 0,
      "Expected at least one validation issue for invalid schema output.",
    );
    assert.equal("value" in result, false);
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

import test from "node:test";
import assert from "node:assert/strict";

import type {
  StructuredLlmGenerationPort,
  StructuredLlmGenerationRequest,
  StructuredLlmOutputSchema,
} from "../../ports/structured-llm-generation/index.js";
import {
  createOpenAiResponsesAdapter,
  type OpenAiResponsesAdapterConfig,
  type OpenAiResponsesClient,
} from "./index.js";

/**
 * Simulated OpenAI client interface for testing.
 * The real adapter will use the official SDK; tests inject this interface.
 */
interface SimulatedOpenAiClient {
  createResponse(
    request: SimulatedOpenAiRequest,
  ): Promise<SimulatedOpenAiResponse>;
}

interface SimulatedOpenAiRequest {
  readonly model: string;
  readonly input: string;
  readonly instructions?: string;
  readonly max_output_tokens?: number;
  readonly text?: {
    readonly format?: {
      readonly type: "json_schema";
      readonly name: string;
      readonly schema: unknown;
      readonly strict: boolean;
    };
  };
}

interface SimulatedOpenAiResponse {
  readonly id: string;
  readonly model: string;
  readonly status: "completed" | "incomplete" | "failed";
  readonly output_text?: string;
  readonly incomplete_details?: {
    readonly reason: string;
  };
  readonly usage?: {
    readonly input_tokens: number;
    readonly output_tokens: number;
    readonly total_tokens: number;
  };
  readonly error?: {
    readonly type: string;
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Factory function type for creating the adapter.
 * The actual implementation will be imported from the adapter module.
 */
type OpenAiResponsesAdapterFactory = (
  config: OpenAiResponsesAdapterConfig,
  client?: OpenAiResponsesClient,
) => StructuredLlmGenerationPort;

// Test fixtures
const validSemanticOutlineSchema: StructuredLlmOutputSchema<{
  readonly finalConcept: string;
  readonly verses: readonly { readonly slot: string; readonly role: string }[];
}> = {
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
      value: value as {
        readonly finalConcept: string;
        readonly verses: readonly {
          readonly slot: string;
          readonly role: string;
        }[];
      },
    };
  },
};

const baseRequest = (): StructuredLlmGenerationRequest<{
  readonly finalConcept: string;
  readonly verses: readonly { readonly slot: string; readonly role: string }[];
}> => ({
  operation: "plan-semantic-outline",
  prompt: {
    id: "planner.semantic-outline",
    version: "0.1.0",
    messages: [
      { role: "system", content: "Devuelve solo un plan JSON validable." },
      { role: "user", content: "Tema: dragones despistados." },
    ],
  },
  input: { context: "dragones despistados", candidateCount: 3 },
  outputSchema: validSemanticOutlineSchema,
  limits: {
    timeoutMs: 1_000,
    maxOutputTokens: 600,
  },
});

const validOpenAiResponse: SimulatedOpenAiResponse = {
  id: "resp-123",
  model: "gpt-4o-2024-08-06",
  status: "completed",
  output_text: JSON.stringify({
    finalConcept: "Un dragon confunde el humo con perfume",
    verses: [
      { slot: "V1", role: "presentacion" },
      { slot: "V2", role: "preparacion" },
      { slot: "V3", role: "giro_tension" },
      { slot: "V4", role: "remate" },
    ],
  }),
  usage: {
    input_tokens: 42,
    output_tokens: 68,
    total_tokens: 110,
  },
};

/**
 * Creates an adapter instance using the actual implementation.
 * The client parameter allows injecting a simulated client for testing.
 */
const createAdapter: OpenAiResponsesAdapterFactory = (
  config: OpenAiResponsesAdapterConfig,
  client?: OpenAiResponsesClient,
) => {
  return createOpenAiResponsesAdapter(config, client);
};

test("rejects missing API key before making any request", async () => {
  // The adapter should throw for missing API key before making any request
  assert.throws(
    () =>
      createAdapter({
        apiKey: undefined as unknown as string,
        model: "gpt-4o-2024-08-06",
      }),
    /API key is required/,
    "Adapter should throw for missing API key.",
  );
});

test("rejects empty string API key before making any request", async () => {
  // The adapter should throw for empty API key before making any request
  assert.throws(
    () =>
      createAdapter({
        apiKey: "",
        model: "gpt-4o-2024-08-06",
      }),
    /API key is required/,
    "Adapter should throw for empty API key.",
  );
});

test("maps OpenAI authentication error to AUTHENTICATION_FAILED", async () => {
  const client: SimulatedOpenAiClient = {
    async createResponse() {
      throw {
        status: 401,
        error: {
          type: "authentication_error",
          code: "invalid_api_key",
          message: "Incorrect API key provided: sk-***def.",
        },
      };
    },
  };

  const adapter = createAdapter(
    { apiKey: "sk-test-invalid", model: "gpt-4o-2024-08-06" },
    client,
  );

  const result = await adapter.generate(baseRequest());

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail("Expected authentication error but got success.");
  }

  assert.equal(result.error.code, "AUTHENTICATION_FAILED");
  assert.equal(result.error.retryable, false);
  assert.ok(
    !result.error.message.includes("sk-test-invalid"),
    "Error message must not contain the API key.",
  );
  assert.ok(
    !result.error.message.includes("sk-***"),
    "Error message must not contain masked API key patterns from the provider.",
  );
});

test("maps OpenAI rate limit error to RATE_LIMITED with retry-after", async () => {
  const client: SimulatedOpenAiClient = {
    async createResponse() {
      throw {
        status: 429,
        headers: { "retry-after": "2" },
        error: {
          type: "rate_limit_error",
          code: "rate_limit_exceeded",
          message: "Rate limit reached for requests.",
        },
      };
    },
  };

  const adapter = createAdapter(
    { apiKey: "sk-test-valid", model: "gpt-4o-2024-08-06" },
    client,
  );

  const result = await adapter.generate(baseRequest());

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail("Expected rate limit error but got success.");
  }

  assert.equal(result.error.code, "RATE_LIMITED");
  assert.equal(result.error.retryable, true);
  assert.equal(typeof result.error.retryAfterMs, "number");
  assert.ok(
    (result.error.retryAfterMs ?? 0) > 0,
    "retryAfterMs should be positive for rate limit errors.",
  );
});

test("maps timeout to TIMEOUT error with provenance", async () => {
  const client: OpenAiResponsesClient = {
    async createResponse(_params, options) {
      // Simulate a delay that respects the abort signal
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => resolve(validOpenAiResponse), 1_500);

        options?.signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timeoutId);
            reject(
              new DOMException("The operation was aborted.", "AbortError"),
            );
          },
          { once: true },
        );
      });
    },
  };

  const adapter = createAdapter(
    { apiKey: "sk-test-valid", model: "gpt-4o-2024-08-06" },
    client,
  );

  const request = {
    ...baseRequest(),
    limits: { ...baseRequest().limits, timeoutMs: 100 },
  };

  const result = await adapter.generate(request);

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail("Expected timeout error but got success.");
  }

  assert.equal(result.error.code, "TIMEOUT");
  assert.equal(result.error.retryable, true);
  assert.ok(
    result.error.provenance !== undefined,
    "Timeout error should include provenance for tracing.",
  );
});

test("maps abort signal to CANCELLED error", async () => {
  const client: OpenAiResponsesClient = {
    async createResponse(_params, options) {
      // Check if signal is already aborted
      if (options?.signal?.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }

      // Simulate a delay that respects the abort signal
      return new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => resolve(validOpenAiResponse), 1_500);

        options?.signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(timeoutId);
            reject(
              new DOMException("The operation was aborted.", "AbortError"),
            );
          },
          { once: true },
        );
      });
    },
  };

  const adapter = createAdapter(
    { apiKey: "sk-test-valid", model: "gpt-4o-2024-08-06" },
    client,
  );

  const controller = new AbortController();
  // Abort immediately
  controller.abort();

  const result = await adapter.generate(baseRequest(), {
    signal: controller.signal,
  });

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail("Expected cancellation error but got success.");
  }

  assert.equal(result.error.code, "CANCELLED");
  assert.equal(result.error.retryable, false);
});

test("maps OpenAI content refusal to CONTENT_REJECTED", async () => {
  const client: SimulatedOpenAiClient = {
    async createResponse() {
      return {
        id: "resp-refused",
        model: "gpt-4o-2024-08-06",
        status: "incomplete",
        incomplete_details: {
          reason: "content_filter",
        },
        usage: {
          input_tokens: 10,
          output_tokens: 0,
          total_tokens: 10,
        },
      };
    },
  };

  const adapter = createAdapter(
    { apiKey: "sk-test-valid", model: "gpt-4o-2024-08-06" },
    client,
  );

  const result = await adapter.generate(baseRequest());

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail("Expected content rejection but got success.");
  }

  assert.equal(result.error.code, "CONTENT_REJECTED");
  assert.equal(result.error.retryable, false);
});

test("maps incomplete response due to max_tokens to PROVIDER_UNAVAILABLE", async () => {
  const client: SimulatedOpenAiClient = {
    async createResponse() {
      return {
        id: "resp-truncated",
        model: "gpt-4o-2024-08-06",
        status: "incomplete",
        incomplete_details: {
          reason: "max_output_tokens",
        },
        output_text: '{"finalConcept": "incomplete...',
        usage: {
          input_tokens: 42,
          output_tokens: 600,
          total_tokens: 642,
        },
      };
    },
  };

  const adapter = createAdapter(
    { apiKey: "sk-test-valid", model: "gpt-4o-2024-08-06" },
    client,
  );

  const result = await adapter.generate(baseRequest());

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail("Expected error for incomplete response but got success.");
  }

  assert.ok(
    result.error.code === "PROVIDER_UNAVAILABLE" ||
      result.error.code === "CONTENT_REJECTED",
    `Expected PROVIDER_UNAVAILABLE or CONTENT_REJECTED but got ${result.error.code}`,
  );
  assert.equal(result.error.retryable, true);
});

test("maps OpenAI server error to PROVIDER_UNAVAILABLE", async () => {
  const client: SimulatedOpenAiClient = {
    async createResponse() {
      throw {
        status: 500,
        error: {
          type: "server_error",
          code: "internal_error",
          message: "The server had an error processing your request.",
        },
      };
    },
  };

  const adapter = createAdapter(
    { apiKey: "sk-test-valid", model: "gpt-4o-2024-08-06" },
    client,
  );

  const result = await adapter.generate(baseRequest());

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail("Expected provider unavailable error but got success.");
  }

  assert.equal(result.error.code, "PROVIDER_UNAVAILABLE");
  assert.equal(result.error.retryable, true);
});

test("never includes API key in error messages or provenance", async () => {
  const secretKey = "sk-super-secret-key-12345";
  const client: SimulatedOpenAiClient = {
    async createResponse() {
      throw {
        status: 401,
        error: {
          type: "authentication_error",
          code: "invalid_api_key",
          message: `Incorrect API key provided: ${secretKey}.`,
        },
      };
    },
  };

  const adapter = createAdapter(
    { apiKey: secretKey, model: "gpt-4o-2024-08-06" },
    client,
  );

  const result = await adapter.generate(baseRequest());

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail("Expected error but got success.");
  }

  const errorJson = JSON.stringify(result.error);
  assert.ok(
    !errorJson.includes(secretKey),
    "Error object must not contain the API key in any field.",
  );
  assert.ok(
    !errorJson.includes("sk-super-secret"),
    "Error object must not contain partial API key patterns.",
  );
});

test("never includes API key in successful response provenance", async () => {
  const secretKey = "sk-super-secret-key-12345";
  const client: SimulatedOpenAiClient = {
    async createResponse() {
      return validOpenAiResponse;
    },
  };

  const adapter = createAdapter(
    { apiKey: secretKey, model: "gpt-4o-2024-08-06" },
    client,
  );

  const result = await adapter.generate(baseRequest());

  assert.equal(result.ok, true);
  if (!result.ok) {
    assert.fail("Expected success but got error.");
  }

  const valueJson = JSON.stringify(result.value);
  assert.ok(
    !valueJson.includes(secretKey),
    "Success value must not contain the API key in provenance or usage.",
  );
});

test("validates structured output against local schema after successful response", async () => {
  const client: SimulatedOpenAiClient = {
    async createResponse() {
      return {
        id: "resp-invalid",
        model: "gpt-4o-2024-08-06",
        status: "completed",
        output_text: JSON.stringify({
          finalConcept: "Un dragon confunde el humo con perfume",
          verses: [{ slot: "V4", role: "remate" }], // Only 1 verse, schema requires 4
        }),
        usage: {
          input_tokens: 42,
          output_tokens: 12,
          total_tokens: 54,
        },
      };
    },
  };

  const adapter = createAdapter(
    { apiKey: "sk-test-valid", model: "gpt-4o-2024-08-06" },
    client,
  );

  const result = await adapter.generate(baseRequest());

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail("Expected validation error but got success.");
  }

  assert.equal(result.error.code, "INVALID_STRUCTURED_OUTPUT");
  assert.equal(result.error.retryable, false);
  assert.ok(
    Array.isArray(result.error.validationIssues) &&
      result.error.validationIssues.length > 0,
    "Should include validation issues from local schema check.",
  );
});

test("handles malformed JSON in output_text", async () => {
  const client: SimulatedOpenAiClient = {
    async createResponse() {
      return {
        id: "resp-malformed",
        model: "gpt-4o-2024-08-06",
        status: "completed",
        output_text: "This is not valid JSON at all.",
        usage: {
          input_tokens: 42,
          output_tokens: 10,
          total_tokens: 52,
        },
      };
    },
  };

  const adapter = createAdapter(
    { apiKey: "sk-test-valid", model: "gpt-4o-2024-08-06" },
    client,
  );

  const result = await adapter.generate(baseRequest());

  assert.equal(result.ok, false);
  if (result.ok) {
    assert.fail("Expected error for malformed JSON but got success.");
  }

  assert.equal(result.error.code, "INVALID_STRUCTURED_OUTPUT");
  assert.equal(result.error.retryable, false);
});

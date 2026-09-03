import test from "node:test";
import assert from "node:assert/strict";

import type {
  StructuredLlmGenerationRequest,
  StructuredLlmOutputSchema,
} from "../ports/structured-llm-generation/index.js";
import { OpenCodeStructuredLlmGenerator } from "./opencode-llm-adapter.js";

interface Outline {
  readonly finalConcept: string;
}

const schema: StructuredLlmOutputSchema<Outline> = {
  name: "outline",
  version: "1.0.0",
  validate(value: unknown) {
    if (
      typeof value !== "object" ||
      value === null ||
      !("finalConcept" in value)
    ) {
      return {
        ok: false,
        issues: [{ path: "$.finalConcept", message: "Required." }],
      };
    }
    return { ok: true, value: value as Outline };
  },
};

const request = (): StructuredLlmGenerationRequest<Outline> => ({
  operation: "plan-outline",
  prompt: {
    id: "planner.outline",
    version: "1.0.0",
    messages: [
      { role: "user", content: "Devuelve JSON con un concepto final." },
    ],
  },
  input: { topic: "dragones" },
  outputSchema: schema,
  limits: { timeoutMs: 30_000, maxOutputTokens: 100 },
});

// This test is opt-in and only runs when OPENCODE_SERVER_URL is set
// Default test suite remains offline
const serverUrl = process.env.OPENCODE_SERVER_URL;
const testFn = serverUrl ? test : test.skip;

testFn(
  "headless server: creates session and returns valid structured output",
  async () => {
    // This test requires a running OpenCode server
    // Set OPENCODE_SERVER_URL=http://127.0.0.1:4096 to enable
    const { OpenCodeClient } = await import("@opencode-ai/client");

    const client = new OpenCodeClient({ baseURL: serverUrl });
    const generator = new OpenCodeStructuredLlmGenerator({
      client,
      directory: process.cwd(),
      model: process.env.OPENCODE_MODEL ?? "default",
    });

    const result = await generator.generate(request());

    if (!result.ok)
      throw new Error(`Expected success, got ${result.error.code}`);

    assert.equal(typeof (result.value.data as Outline).finalConcept, "string");
    assert.ok((result.value.data as Outline).finalConcept.length > 0);
    assert.equal(result.value.provenance.provider, "opencode");
    assert.ok(result.value.provenance.requestId.length > 0);
    assert.ok(result.value.provenance.durationMs > 0);
  },
);

testFn("headless server: handles timeout correctly", async () => {
  const { OpenCodeClient } = await import("@opencode-ai/client");

  const client = new OpenCodeClient({ baseURL: serverUrl });
  const generator = new OpenCodeStructuredLlmGenerator({
    client,
    directory: process.cwd(),
    model: process.env.OPENCODE_MODEL ?? "default",
  });

  const shortTimeoutRequest = {
    ...request(),
    limits: { timeoutMs: 1, maxOutputTokens: 100 }, // 1ms timeout
  };

  const result = await generator.generate(shortTimeoutRequest);

  assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected failure");
  assert.equal(result.error.code, "TIMEOUT");
  assert.equal(result.error.retryable, true);
});

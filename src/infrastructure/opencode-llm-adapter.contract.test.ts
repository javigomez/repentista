import test from "node:test";
import assert from "node:assert/strict";

import type {
  StructuredLlmGenerationRequest,
  StructuredLlmOutputSchema,
} from "../ports/structured-llm-generation/index.js";
import { OpenCodeStructuredLlmGenerator } from "./opencode-llm-adapter.js";

interface FakeOpenCodeClient {
  readonly session: {
    create(input: {
      readonly location: { readonly directory: string };
    }): Promise<{ readonly id: string }>;
    prompt(input: {
      readonly sessionID: string;
      readonly text: string;
    }): Promise<unknown>;
  };
}

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
    messages: [{ role: "user", content: "Devuelve JSON." }],
  },
  input: { topic: "dragones" },
  outputSchema: schema,
  limits: { timeoutMs: 1_000, maxOutputTokens: 100 },
});

test("creates a session, submits the prompt and returns normalized provenance", async () => {
  const calls: string[] = [];
  const client: FakeOpenCodeClient = {
    session: {
      async create() {
        calls.push("create");
        return { id: "ses_branch_a" };
      },
      async prompt(input) {
        calls.push(`prompt:${input.sessionID}:${input.text}`);
        return {
          info: { id: "msg_1", role: "assistant" },
          parts: [{ type: "text", text: '{"finalConcept":"humo"}' }],
        };
      },
    },
  };

  const generator = new OpenCodeStructuredLlmGenerator({
    client,
    directory: "branches/a",
    model: "provider/model",
  });
  const result = await generator.generate(request());

  assert.deepEqual(calls, ["create", "prompt:ses_branch_a:Devuelve JSON."]);
  if (!result.ok) throw new Error(`Expected success, got ${result.error.code}`);
  assert.equal((result.value.data as Outline).finalConcept, "humo");
  assert.equal(result.value.provenance.provider, "opencode");
  assert.equal(result.value.provenance.model, "provider/model");
  assert.equal(result.value.provenance.requestId, "msg_1");
});

test("returns PROVIDER_UNAVAILABLE when session creation fails with connection error", async () => {
  const client: FakeOpenCodeClient = {
    session: {
      async create() {
        throw new Error("connect ECONNREFUSED 127.0.0.1:4096");
      },
      async prompt() {
        throw new Error("Should not be called");
      },
    },
  };

  const generator = new OpenCodeStructuredLlmGenerator({
    client,
    directory: "branches/a",
    model: "provider/model",
  });
  const result = await generator.generate(request());

  assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected failure");
  assert.equal(result.error.code, "PROVIDER_UNAVAILABLE");
  assert.equal(result.error.retryable, true);
  assert.match(result.error.message, /unavailable/i);
});

test("returns TIMEOUT when prompt exceeds configured timeout", async () => {
  const client: FakeOpenCodeClient = {
    session: {
      async create() {
        return { id: "ses_timeout" };
      },
      async prompt() {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Operation timed out")), 1_100);
        });
      },
    },
  };

  const generator = new OpenCodeStructuredLlmGenerator({
    client,
    directory: "branches/a",
    model: "provider/model",
  });
  const result = await generator.generate(request());

  assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected failure");
  assert.equal(result.error.code, "TIMEOUT");
  assert.equal(result.error.retryable, true);
});

test("returns CANCELLED when abort signal is triggered", async () => {
  const client: FakeOpenCodeClient = {
    session: {
      async create() {
        return { id: "ses_cancel" };
      },
      async prompt() {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error("The operation was aborted")), 50);
        });
      },
    },
  };

  const generator = new OpenCodeStructuredLlmGenerator({
    client,
    directory: "branches/a",
    model: "provider/model",
  });
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 10);
  const result = await generator.generate(request(), {
    signal: controller.signal,
  });

  assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected failure");
  assert.equal(result.error.code, "CANCELLED");
  assert.equal(result.error.retryable, false);
});

test("returns INVALID_STRUCTURED_OUTPUT when response is not valid JSON", async () => {
  const client: FakeOpenCodeClient = {
    session: {
      async create() {
        return { id: "ses_malformed" };
      },
      async prompt() {
        return {
          info: { id: "msg_malformed", role: "assistant" },
          parts: [{ type: "text", text: "not json at all" }],
        };
      },
    },
  };

  const generator = new OpenCodeStructuredLlmGenerator({
    client,
    directory: "branches/a",
    model: "provider/model",
  });
  const result = await generator.generate(request());

  assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected failure");
  assert.equal(result.error.code, "INVALID_STRUCTURED_OUTPUT");
  assert.equal(result.error.retryable, false);
  assert.ok(result.error.validationIssues.length > 0);
});

test("returns INVALID_STRUCTURED_OUTPUT when JSON does not match schema", async () => {
  const client: FakeOpenCodeClient = {
    session: {
      async create() {
        return { id: "ses_schema_mismatch" };
      },
      async prompt() {
        return {
          info: { id: "msg_schema", role: "assistant" },
          parts: [{ type: "text", text: '{"wrong":"field"}' }],
        };
      },
    },
  };

  const generator = new OpenCodeStructuredLlmGenerator({
    client,
    directory: "branches/a",
    model: "provider/model",
  });
  const result = await generator.generate(request());

  assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected failure");
  assert.equal(result.error.code, "INVALID_STRUCTURED_OUTPUT");
  assert.equal(result.error.retryable, false);
  assert.ok(result.error.validationIssues.length > 0);
});

test("returns PROVIDER_UNAVAILABLE when server returns model error", async () => {
  const client: FakeOpenCodeClient = {
    session: {
      async create() {
        return { id: "ses_model_error" };
      },
      async prompt() {
        throw new Error("model not found: provider/unknown-model");
      },
    },
  };

  const generator = new OpenCodeStructuredLlmGenerator({
    client,
    directory: "branches/a",
    model: "provider/unknown-model",
  });
  const result = await generator.generate(request());

  assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected failure");
  assert.equal(result.error.code, "PROVIDER_UNAVAILABLE");
  assert.equal(result.error.retryable, true);
});

test("uses isolated sessions for different directories to prevent cross-contamination", async () => {
  const createdSessions: Array<{ directory: string; sessionId: string }> = [];
  let sessionCounter = 0;

  const client: FakeOpenCodeClient = {
    session: {
      async create(input) {
        sessionCounter++;
        const sessionId = `ses_${sessionCounter}`;
        createdSessions.push({
          directory: input.location.directory,
          sessionId,
        });
        return { id: sessionId };
      },
      async prompt(input) {
        return {
          info: { id: `msg_${input.sessionID}`, role: "assistant" },
          parts: [{ type: "text", text: '{"finalConcept":"test"}' }],
        };
      },
    },
  };

  const generatorA = new OpenCodeStructuredLlmGenerator({
    client,
    directory: "branches/a",
    model: "provider/model",
  });
  const generatorB = new OpenCodeStructuredLlmGenerator({
    client,
    directory: "branches/b",
    model: "provider/model",
  });

  const resultA = await generatorA.generate(request());
  const resultB = await generatorB.generate(request());

  assert.equal(resultA.ok, true);
  assert.equal(resultB.ok, true);
  if (!resultA.ok || !resultB.ok) throw new Error("Expected both to succeed");

  assert.equal(createdSessions.length, 2);
  assert.notEqual(createdSessions[0].sessionId, createdSessions[1].sessionId);
  assert.equal(createdSessions[0].directory, "branches/a");
  assert.equal(createdSessions[1].directory, "branches/b");
  assert.equal(
    resultA.value.provenance.requestId,
    `msg_${createdSessions[0].sessionId}`,
  );
  assert.equal(
    resultB.value.provenance.requestId,
    `msg_${createdSessions[1].sessionId}`,
  );
});

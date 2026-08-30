import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

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
  verses: [
    { slot: "V1", role: "presentacion" },
    { slot: "V2", role: "preparacion" },
    { slot: "V3", role: "giro_tension" },
    { slot: "V4", role: "remate" },
  ] as const,
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

    return { ok: true as const, value: value as unknown as SemanticOutline };
  },
});

test("keeps public structured generation declarations provider-neutral", async () => {
  const source = await readFile("src/ports/structured-llm-generation/index.ts", "utf8");

  assert.doesNotMatch(source, /\bOpenAI\b/u);
  assert.doesNotMatch(source, /\bOpenCode\b/u);
  assert.doesNotMatch(source, /\bAnthropic\b/u);
  assert.doesNotMatch(source, /from\s+["'](?:openai|@openai|opencode|@anthropic)/u);
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

const providerErrorScenarios = [
  {
    name: "timeout",
    code: "TIMEOUT",
    message: "Structured LLM operation timed out after 1000 ms.",
    retryable: true,
    providerRequestId: "fixture-timeout",
    completedAt: "2026-08-30T10:00:02.000Z",
    durationMs: 1_000,
  },
  {
    name: "cancellation",
    code: "CANCELLED",
    message: "Structured LLM operation was cancelled.",
    retryable: false,
    providerRequestId: "fixture-cancelled",
    completedAt: "2026-08-30T10:00:03.000Z",
    durationMs: 7,
  },
  {
    name: "authentication",
    code: "AUTHENTICATION_FAILED",
    message: "The provider rejected authentication.",
    retryable: false,
    providerRequestId: "fixture-authentication",
    completedAt: "2026-08-30T10:00:04.000Z",
    durationMs: 5,
  },
  {
    name: "rate limit",
    code: "RATE_LIMITED",
    message: "The provider rate limit was exceeded.",
    retryable: true,
    retryAfterMs: 2_500,
    providerRequestId: "fixture-rate-limit",
    completedAt: "2026-08-30T10:00:05.000Z",
    durationMs: 11,
  },
  {
    name: "content rejection",
    code: "CONTENT_REJECTED",
    message: "The provider rejected the content.",
    retryable: false,
    providerRequestId: "fixture-rejection",
    completedAt: "2026-08-30T10:00:06.000Z",
    durationMs: 17,
  },
  {
    name: "provider unavailable",
    code: "PROVIDER_UNAVAILABLE",
    message: "The provider is unavailable.",
    retryable: true,
    providerRequestId: "fixture-unavailable",
    completedAt: "2026-08-30T10:00:07.000Z",
    durationMs: 31,
  },
] as const;

for (const scenario of providerErrorScenarios) {
  test(`normalizes ${scenario.name} errors without returning data`, async () => {
    const generator = new FixtureStructuredLlmGenerator([
      {
        operation: "plan-semantic-outline",
        provider: "fixture-provider",
        model: "fixture-structured-v1",
        providerRequestId: scenario.providerRequestId,
        completedAt: scenario.completedAt,
        durationMs: scenario.durationMs,
        error: {
          code: scenario.code,
          message: scenario.message,
          retryable: scenario.retryable,
          retryAfterMs: "retryAfterMs" in scenario ? scenario.retryAfterMs : undefined,
        },
      },
    ]);

    const result = await generator.generate(baseRequest());

    assert.equal(result.ok, false);
    if (result.ok) return;

    assert.equal(result.error.code, scenario.code);
    assert.equal(result.error.message, scenario.message);
    assert.equal(result.error.retryable, scenario.retryable);
    assert.deepEqual(result.error.provenance, {
      provider: "fixture-provider",
      model: "fixture-structured-v1",
      operation: "plan-semantic-outline",
      prompt: {
        id: "planner.semantic-outline",
        version: "0.1.0",
      },
      requestId: scenario.providerRequestId,
      completedAt: scenario.completedAt,
      durationMs: scenario.durationMs,
    });
    assert.equal("validationIssues" in result.error, false);
    assert.equal("value" in result, false);

    if ("retryAfterMs" in scenario) {
      assert.equal(result.error.retryAfterMs, scenario.retryAfterMs);
    } else {
      assert.equal("retryAfterMs" in result.error, false);
    }
  });
}

test("replays fixture sequences deterministically", async () => {
  const createGenerator = (): FixtureStructuredLlmGenerator =>
    new FixtureStructuredLlmGenerator([
      {
        operation: "plan-semantic-outline",
        output: validOutline,
        provider: "fixture-provider",
        model: "fixture-structured-v1",
        providerRequestId: "fixture-sequence-1",
        completedAt: "2026-08-30T10:01:00.000Z",
        durationMs: 13,
        usage: {
          inputTokens: 10,
          outputTokens: 20,
        },
      },
      {
        operation: "plan-semantic-outline",
        provider: "fixture-provider",
        model: "fixture-structured-v1",
        providerRequestId: "fixture-sequence-2",
        completedAt: "2026-08-30T10:01:01.000Z",
        durationMs: 1_000,
        error: {
          code: "TIMEOUT",
          message: "Structured LLM operation timed out after 1000 ms.",
          retryable: true,
        },
      },
      {
        operation: "plan-semantic-outline",
        output: {
          finalConcept: "Un dragon se perfuma con humo",
          verses: validOutline.verses,
        },
        provider: "fixture-provider",
        model: "fixture-structured-v1",
        providerRequestId: "fixture-sequence-3",
        completedAt: "2026-08-30T10:01:02.000Z",
        durationMs: 15,
        usage: {
          inputTokens: 11,
          outputTokens: 22,
        },
      },
    ]);

  const firstRun = await collectSequence(createGenerator());
  const secondRun = await collectSequence(createGenerator());

  assert.deepEqual(firstRun, [
    { ok: true, requestId: "fixture-sequence-1", totalTokens: 30 },
    { ok: false, code: "TIMEOUT", requestId: "fixture-sequence-2" },
    { ok: true, requestId: "fixture-sequence-3", totalTokens: 33 },
  ]);
  assert.deepEqual(secondRun, firstRun);
});

async function collectSequence(
  generator: FixtureStructuredLlmGenerator,
): Promise<
  readonly (
    | { readonly ok: true; readonly requestId: string; readonly totalTokens: number }
    | { readonly ok: false; readonly code: string; readonly requestId: string | undefined }
  )[]
> {
  const results = await Promise.all([
    generator.generate(baseRequest()),
    generator.generate(baseRequest()),
    generator.generate(baseRequest()),
  ]);

  return results.map((result) => {
    if (result.ok) {
      return {
        ok: true as const,
        requestId: result.value.provenance.requestId,
        totalTokens: result.value.usage.totalTokens,
      };
    }

    return {
      ok: false as const,
      code: result.error.code,
      requestId: result.error.provenance?.requestId,
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

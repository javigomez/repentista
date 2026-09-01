import test from "node:test";
import assert from "node:assert/strict";

import {
  writeSingleVerseVariants,
  type SingleVerseVariantDraft,
  type SingleVerseVariantWriterDependencies,
  type SingleVerseVariantWritingRequest,
} from "./single-verse-variant-writing/index.js";
import { FixtureStructuredLlmGenerator } from "../testing/structured-llm-generation-fake.js";
import { sequenceDouble } from "../testing/test-doubles.js";

const SLOTS = ["V1", "V2", "V3", "V4"] as const;

const FIXED_ENDING_BY_SLOT: Readonly<Record<(typeof SLOTS)[number], string | undefined>> =
  Object.freeze({
    V1: undefined,
    V2: "fuego",
    V3: undefined,
    V4: "juego",
  });

const TEXTS_BY_SLOT: Readonly<Record<(typeof SLOTS)[number], string>> = Object.freeze({
  V1: "Entra un gato con mucha hambre",
  V2: "Promete compartir su fuego",
  V3: "Se despista y guarda el pan",
  V4: "Solo ofrece olor de juego",
});

const baseRequest = (
  overrides: Partial<SingleVerseVariantWritingRequest> = {},
): SingleVerseVariantWritingRequest => {
  const slot = overrides.slot ?? "V2";
  const plannedFinalWord =
    overrides.plannedFinalWord === undefined ? FIXED_ENDING_BY_SLOT[slot] : overrides.plannedFinalWord;

  return {
    slot,
    semanticAnchor: "promete guardar pan para otro",
    metricBudget: {
      targetMetricPositions: 7,
      allowedEndingKinds: ["llana"],
      reliability: "CONFIABLE",
      ...(plannedFinalWord === undefined
        ? {}
        : {
            finalWordAnalysis: {
              word: plannedFinalWord,
              stressKind: "llana" as const,
              stressedSyllableIndex: 1,
            },
          }),
    },
    ...(plannedFinalWord === undefined ? {} : { plannedFinalWord }),
    immutableConstraints: ["no cambiar la palabra final cuando exista"],
    variantCount: 3,
    maxAttempts: 3,
    ...overrides,
  };
};

const validOutput = (
  slot: (typeof SLOTS)[number],
  texts: readonly string[],
  extra?: Record<string, unknown>,
): Record<string, unknown> => ({
  slot,
  variants: texts.map((text) => ({ text, rationale: "Cierra la escena con claridad." })),
  ...extra,
});

const writerDeps = (
  steps: ConstructorParameters<typeof FixtureStructuredLlmGenerator>[0],
  ids: readonly string[] = ["draft-1", "draft-2", "draft-3"],
): SingleVerseVariantWriterDependencies => ({
  generator: new FixtureStructuredLlmGenerator(steps),
  nextVariantId: sequenceDouble(ids),
});

const successStep = (
  slot: (typeof SLOTS)[number],
  output: Record<string, unknown>,
  providerRequestId: string,
) => ({
  operation: `write-single-verse-variant.${slot.toLowerCase()}`,
  output,
  provider: "fixture-provider",
  model: "fixture-structured-v1",
  providerRequestId,
  completedAt: "2026-08-31T14:30:00.000Z",
  durationMs: 17,
  usage: { inputTokens: 61, outputTokens: 19 },
});

test("writes a single slot of drafts for every V1–V4 request without certifying them", async () => {
  for (const slot of SLOTS) {
    const request = baseRequest({ slot });
    const drafts = await collectDrafts(request, slot, [TEXTS_BY_SLOT[slot], TEXTS_BY_SLOT[slot], TEXTS_BY_SLOT[slot]]);

    assert.equal(drafts.length, 3, `${slot} should return the requested batch size`);
    assert.equal(new Set(drafts.map((draft) => draft.id)).size, 3, `${slot} should assign unique ids`);
    assert.ok(drafts.every((draft) => draft.slot === slot), `${slot} drafts must stay on one slot`);
    assert.ok(
      drafts.every((draft) => draft.state === "PENDIENTE_VALIDACION_DURA"),
      `${slot} drafts must remain pending hard validation`,
    );

    const plannedFinalWord = FIXED_ENDING_BY_SLOT[slot];

    if (plannedFinalWord !== undefined) {
      assert.ok(
        drafts.every((draft) => draft.text.endsWith(plannedFinalWord)),
        `${slot} drafts must keep the obligatory final word "${plannedFinalWord}"`,
      );
    }
  }
});

test("caps the batch to the requested variant count when the LLM over-delivers", async () => {
  const request = baseRequest({ slot: "V2", variantCount: 2 });
  const drafts = await collectDrafts(request, "V2", ["Traigo fuego", "Guardo fuego", "Escondo fuego"]);

  assert.equal(drafts.length, 2);
  assert.deepEqual(
    drafts.map((draft) => draft.text),
    ["Traigo fuego", "Guardo fuego"],
  );
});

test("records provenance and usage from the accepted generation attempt", async () => {
  const request = baseRequest({ slot: "V2" });
  const result = await writeSingleVerseVariants(
    request,
    writerDeps([successStep("V2", validOutput("V2", ["Traigo fuego"]), "fixture-v2-provenance")]),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.value.provenance, {
    provider: "fixture-provider",
    model: "fixture-structured-v1",
    operation: "write-single-verse-variant.v2",
    prompt: { id: "generation.single-verse-variant.v2", version: "0.1.0" },
    requestId: "fixture-v2-provenance",
    completedAt: "2026-08-31T14:30:00.000Z",
    durationMs: 17,
  });
  assert.deepEqual(result.value.usage, { inputTokens: 61, outputTokens: 19, totalTokens: 80 });
  assert.equal(result.value.attempts, 1);
  assert.deepEqual(result.value.drafts[0]?.provenance, result.value.provenance);
});

test("rejects a monolithic quatrain as a contract breach", async () => {
  const request = baseRequest({ slot: "V2", maxAttempts: 1 });
  const result = await writeSingleVerseVariants(
    request,
    writerDeps([
      successStep(
        "V2",
        validOutput("V2", ["Traigo fuego\nNo lo niego\nGuardo el pan\nSoy el juego"]),
        "fixture-monolithic",
      ),
    ]),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "CONTRACT_BREACH");
  assert.equal(result.error.breach.code, "MONOLITHIC_QUATRAIN");
  assert.equal(result.error.attempts, 1);
});

test("rejects a changed final word as a contract breach", async () => {
  const request = baseRequest({ slot: "V2", plannedFinalWord: "fuego", maxAttempts: 1 });
  const result = await writeSingleVerseVariants(
    request,
    writerDeps([
      successStep("V2", validOutput("V2", ["Traigo llama"]), "fixture-changed-final"),
    ]),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "CONTRACT_BREACH");
  assert.equal(result.error.breach.code, "CHANGED_FINAL_WORD");
  assert.equal(result.error.attempts, 1);
});

test("rejects a wrong role as a contract breach", async () => {
  const request = baseRequest({ slot: "V2", maxAttempts: 1 });
  const result = await writeSingleVerseVariants(
    request,
    writerDeps([
      successStep("V2", validOutput("V3", ["Se despista con el pan"]), "fixture-wrong-role"),
    ]),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "CONTRACT_BREACH");
  assert.equal(result.error.breach.code, "WRONG_SLOT");
  assert.equal(result.error.attempts, 1);
});

test("rejects extra text fields through schema validation", async () => {
  const request = baseRequest({ slot: "V2", maxAttempts: 1 });
  const result = await writeSingleVerseVariants(
    request,
    writerDeps([
      successStep(
        "V2",
        validOutput("V2", ["Traigo fuego"], { quatrain: "Traigo fuego\nNo lo niego" }),
        "fixture-extra-text",
      ),
    ]),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "CONTRACT_BREACH");
  assert.equal(result.error.breach.code, "INVALID_STRUCTURED_OUTPUT");
  assert.deepEqual(result.error.breach.issues, [
    { path: "$.quatrain", message: "Unexpected field; expected only slot and variants." },
  ]);
  assert.equal(result.error.attempts, 1);
});

test("exhausts retries after repeated provider failures", async () => {
  const request = baseRequest({ slot: "V2", maxAttempts: 3 });
  const timeoutStep = {
    operation: "write-single-verse-variant.v2",
    provider: "fixture-provider",
    model: "fixture-structured-v1",
    providerRequestId: "fixture-timeout",
    completedAt: "2026-08-31T14:30:00.000Z",
    durationMs: 3_000,
    error: {
      code: "TIMEOUT" as const,
      message: "Structured LLM operation timed out after 3000 ms.",
      retryable: true,
    },
  };

  const result = await writeSingleVerseVariants(
    request,
    writerDeps([timeoutStep, timeoutStep, timeoutStep]),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "RETRY_EXHAUSTED");
  assert.equal(result.error.attempts, 3);
  assert.equal(result.error.lastError.code, "TIMEOUT");
});

test("recovers by retrying after a contract breach and succeeding", async () => {
  const request = baseRequest({ slot: "V2", maxAttempts: 2 });
  const result = await writeSingleVerseVariants(
    request,
    writerDeps([
      successStep("V2", validOutput("V2", ["Traigo llama"]), "fixture-breach-1"),
      successStep("V2", validOutput("V2", ["Traigo fuego"]), "fixture-breach-2"),
    ]),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.attempts, 2);
  assert.deepEqual(
    result.value.drafts.map((draft) => draft.text),
    ["Traigo fuego"],
  );
});

test("never emits more than one slot per successful operation", async () => {
  const request = baseRequest({ slot: "V4", variantCount: 2 });
  const result = await writeSingleVerseVariants(
    request,
    writerDeps([
      successStep("V4", validOutput("V4", ["Cierra con juego", "Remata con juego"]), "fixture-v4"),
    ]),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.slot, "V4");
  assert.ok(result.value.drafts.every((draft) => draft.slot === "V4"));
});

async function collectDrafts(
  request: SingleVerseVariantWritingRequest,
  slot: (typeof SLOTS)[number],
  texts: readonly string[],
): Promise<readonly SingleVerseVariantDraft[]> {
  const result = await writeSingleVerseVariants(
    request,
    writerDeps([successStep(slot, validOutput(slot, texts), `fixture-${slot.toLowerCase()}`)]),
  );

  if (!result.ok) {
    assert.fail(`Expected writer success for ${slot}, got ${result.error.code}.`);
  }

  return result.value.drafts;
}

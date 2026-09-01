import test from "node:test";
import assert from "node:assert/strict";

import {
  planVerseSemanticAnchors,
  type FixedFinalWord,
  type VerseSemanticAnchorPlanningRequest,
} from "./verse-semantic-anchor-planning/index.js";
import type {
  StructuredLlmGenerationError,
  StructuredLlmGenerationPort,
  StructuredLlmGenerationRequest,
  StructuredLlmGenerationResult,
} from "../ports/structured-llm-generation/index.js";

type Slot = "V1" | "V2" | "V3" | "V4";
type Role = "PRESENTACION" | "PREPARACION" | "GIRO_TENSION" | "REMATE";
type WarningKind = "CLICHE" | "AMBIGUITY" | "WEAK_CAUSALITY";

interface LlmAnchor {
  readonly slot: Slot;
  readonly role: Role;
  readonly objective: string;
  readonly mandatoryElements: readonly string[];
  readonly optionalElements: readonly string[];
  readonly forbiddenElements: readonly string[];
  readonly fixedFinalWord?: { readonly id: string; readonly word: string };
}

interface LlmOutput {
  readonly scene: string;
  readonly sharedReferents: readonly string[];
  readonly warnings: readonly { readonly kind: WarningKind; readonly detail: string }[];
  readonly anchors: readonly LlmAnchor[];
}

const fixedFinalWords = Object.freeze({
  v2: Object.freeze({ id: "word-juego", word: "juego" }),
  v4: Object.freeze({ id: "word-dragon", word: "dragón" }),
});

const semanticPlan = Object.freeze({
  centralIdea: "Un dragón presume de que su humo huele a perfume elegante.",
  scene: "La cueva de un dragón presumido.",
  twist: "El humo no huele como él cree.",
  finalIntent: "Comparar el humo con un perfume elegante.",
  verseFunctions: Object.freeze({
    V1: "Presentar al dragón y su cueva.",
    V2: "Preparar la idea del humo como perfume.",
    V3: "Torcer hacia la confusión del dragón.",
    V4: "Rematar comparando el humo con perfume.",
  }),
});

const validOutput = (overrides: Partial<LlmOutput> = {}): LlmOutput => ({
  scene: "Un dragón presumido perfuma su cueva con humo.",
  sharedReferents: ["dragón", "humo"],
  warnings: [
    {
      kind: "CLICHE",
      detail: "El dragón que echa humo es un tópico frecuente.",
    },
  ],
  anchors: [
    {
      slot: "V1",
      role: "PRESENTACION",
      objective: "presentar al dragón y su cueva",
      mandatoryElements: ["el dragón", "la cueva"],
      optionalElements: ["el espejo"],
      forbiddenElements: ["el gato"],
    },
    {
      slot: "V2",
      role: "PREPARACION",
      objective: "preparar la idea del humo como perfume",
      mandatoryElements: ["el humo", "el perfume"],
      optionalElements: [],
      forbiddenElements: [],
      fixedFinalWord: { id: "word-juego", word: "juego" },
    },
    {
      slot: "V3",
      role: "GIRO_TENSION",
      objective: "torcer la escena hacia la confusión",
      mandatoryElements: ["la confusión", "el espejo"],
      optionalElements: [],
      forbiddenElements: ["el gato"],
    },
    {
      slot: "V4",
      role: "REMATE",
      objective: "rematar comparando el humo con perfume",
      mandatoryElements: ["el humo", "el dragón"],
      optionalElements: [],
      forbiddenElements: [],
      fixedFinalWord: { id: "word-dragon", word: "dragón" },
    },
  ],
  ...overrides,
});

const planningRequest = (): VerseSemanticAnchorPlanningRequest => ({
  semanticPlan,
  fixedFinalWords,
});

class CapturingAnchorPlanner implements StructuredLlmGenerationPort {
  readonly requests: StructuredLlmGenerationRequest<unknown>[] = [];

  constructor(
    private readonly output: unknown,
    private readonly providerError?: StructuredLlmGenerationError,
  ) {}

  async generate<TOutput>(
    request: StructuredLlmGenerationRequest<TOutput>,
  ): Promise<StructuredLlmGenerationResult<TOutput>> {
    this.requests.push(request as unknown as StructuredLlmGenerationRequest<unknown>);

    if (this.providerError !== undefined) {
      return { ok: false, error: this.providerError };
    }

    const validation = request.outputSchema.validate(this.output);

    if (!validation.ok) {
      return {
        ok: false,
        error: {
          code: "INVALID_STRUCTURED_OUTPUT",
          message: `Fixture output failed schema validation for ${request.outputSchema.name}.`,
          retryable: false,
          validationIssues: validation.issues,
        },
      };
    }

    return {
      ok: true,
      value: {
        data: validation.value,
        provenance: {
          provider: "fixture-provider",
          model: "fixture-anchor-planner",
          operation: request.operation,
          prompt: { id: request.prompt.id, version: request.prompt.version },
          requestId: "fixture-anchor-1",
          completedAt: "2026-09-01T10:00:00.000Z",
          durationMs: 21,
        },
        usage: {
          inputTokens: 120,
          outputTokens: 80,
          totalTokens: 200,
        },
      },
    };
  }
}

const withAnchor = (
  output: LlmOutput,
  slot: Slot,
  patch: Partial<LlmAnchor>,
): LlmOutput => ({
  ...output,
  anchors: output.anchors.map((anchor) => (anchor.slot === slot ? { ...anchor, ...patch } : anchor)),
});

test("plans role-specific anchors that share a scene and preserve fixed V2/V4 words", async () => {
  const planner = new CapturingAnchorPlanner(validOutput());
  const result = await planVerseSemanticAnchors(planningRequest(), { planner });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.scene, "Un dragón presumido perfuma su cueva con humo.");
  assert.deepEqual(result.value.sharedReferents, ["dragón", "humo"]);
  assert.deepEqual(
    result.value.anchors.map((anchor) => anchor.slot),
    ["V1", "V2", "V3", "V4"],
  );
  assert.deepEqual(
    result.value.anchors.map((anchor) => anchor.role),
    ["PRESENTACION", "PREPARACION", "GIRO_TENSION", "REMATE"],
  );
  assert.deepEqual(result.value.anchors[1]?.fixedFinalWord, { id: "word-juego", word: "juego" });
  assert.deepEqual(result.value.anchors[3]?.fixedFinalWord, { id: "word-dragon", word: "dragón" });
  assert.equal(result.value.provenance.prompt.id, "generation.verse-semantic-anchor-planning");
  assert.equal(result.value.provenance.prompt.version, "0.1.0");
});

test("sends the semantic plan and fixed final words to the planner for traceability", async () => {
  const planner = new CapturingAnchorPlanner(validOutput());
  await planVerseSemanticAnchors(planningRequest(), { planner });

  assert.equal(planner.requests.length, 1);
  assert.deepEqual(planner.requests[0]?.input, {
    plan: semanticPlan,
    fixedFinalWords,
  });
  assert.equal(planner.requests[0]?.prompt.id, "generation.verse-semantic-anchor-planning");
  assert.equal(planner.requests[0]?.prompt.version, "0.1.0");
});

test("records cliché, ambiguity and weak-causality warnings without rejecting the plan", async () => {
  const planner = new CapturingAnchorPlanner(
    validOutput({
      warnings: [
        { kind: "CLICHE", detail: "dragón con humo es un tópico" },
        { kind: "AMBIGUITY", detail: "perfume puede ser literal o irónico" },
        { kind: "WEAK_CAUSALITY", detail: "no se explica por qué huele bien" },
      ],
    }),
  );
  const result = await planVerseSemanticAnchors(planningRequest(), { planner });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.value.warnings, [
    { kind: "CLICHE", detail: "dragón con humo es un tópico" },
    { kind: "AMBIGUITY", detail: "perfume puede ser literal o irónico" },
    { kind: "WEAK_CAUSALITY", detail: "no se explica por qué huele bien" },
  ]);
});

test("rejects four isolated ideas that never share a referent", async () => {
  const planner = new CapturingAnchorPlanner(validOutput({ sharedReferents: [] }));
  const result = await planVerseSemanticAnchors(planningRequest(), { planner });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "ISOLATED_IDEAS");
});

test("rejects a V2 anchor that contradicts its fixed final word", async () => {
  const planner = new CapturingAnchorPlanner(
    withAnchor(validOutput(), "V2", {
      fixedFinalWord: { id: "word-fuego", word: "fuego" },
    }),
  );
  const result = await planVerseSemanticAnchors(planningRequest(), { planner });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "FIXED_WORD_CONTRADICTION");
  assert.equal(result.error.slot, "V2");
});

test("rejects a V2 anchor that forbids its own fixed final word", async () => {
  const planner = new CapturingAnchorPlanner(
    withAnchor(validOutput(), "V2", {
      forbiddenElements: ["juego"],
    }),
  );
  const result = await planVerseSemanticAnchors(planningRequest(), { planner });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "FIXED_WORD_CONTRADICTION");
  assert.equal(result.error.slot, "V2");
});

test("rejects contradictory anchors whose forbidden element is mandatory elsewhere", async () => {
  const withMandatoryPerfume = withAnchor(validOutput(), "V1", {
    mandatoryElements: ["el perfume", "el dragón"],
  });
  const planner = new CapturingAnchorPlanner(
    withAnchor(withMandatoryPerfume, "V3", {
      forbiddenElements: ["el perfume"],
    }),
  );
  const result = await planVerseSemanticAnchors(planningRequest(), { planner });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "CONTRADICTORY_ANCHORS");
});

test("rejects anchors that contain verse-like complete sentences", async () => {
  const planner = new CapturingAnchorPlanner(
    withAnchor(validOutput(), "V3", {
      objective: "El dragón confundió el humo con perfume.",
    }),
  );
  const result = await planVerseSemanticAnchors(planningRequest(), { planner });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "VERSE_LIKE_TEXT");
  assert.equal(result.error.slot, "V3");
});

test("rejects a plan that omits a verse role", async () => {
  const planner = new CapturingAnchorPlanner({
    ...validOutput(),
    anchors: validOutput().anchors.filter((anchor) => anchor.slot !== "V3"),
  });
  const result = await planVerseSemanticAnchors(planningRequest(), { planner });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "MISSING_VERSE_ROLE");
  assert.deepEqual(result.error.missingSlots, ["V3"]);
});

test("rejects a verse whose role does not match its slot", async () => {
  const planner = new CapturingAnchorPlanner(
    withAnchor(validOutput(), "V3", { role: "REMATE" }),
  );
  const result = await planVerseSemanticAnchors(planningRequest(), { planner });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "INVALID_VERSE_ROLE");
  assert.equal(result.error.slot, "V3");
  assert.equal(result.error.receivedRole, "REMATE");
});

test("stops with PLANNER_FAILED when the structured planner times out", async () => {
  const planner = new CapturingAnchorPlanner(undefined, {
    code: "TIMEOUT",
    message: "Structured LLM operation timed out.",
    retryable: true,
  });
  const result = await planVerseSemanticAnchors(planningRequest(), { planner });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "PLANNER_FAILED");
  assert.equal(result.error.cause.code, "TIMEOUT");
});

test("stops with PLANNER_FAILED when the structured output is invalid", async () => {
  const planner = new CapturingAnchorPlanner({
    scene: 42,
    sharedReferents: [],
    warnings: [],
    anchors: [],
  });
  const result = await planVerseSemanticAnchors(planningRequest(), { planner });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "PLANNER_FAILED");
  assert.equal(result.error.cause.code, "INVALID_STRUCTURED_OUTPUT");
});

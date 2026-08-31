import test from "node:test";
import assert from "node:assert/strict";

import {
  selectV4FinalWord,
  type V4FinalWordCandidateInput,
  type V4FinalWordSelectionRequest,
} from "./v4-final-word-selection/index.js";
import type {
  StructuredLlmGenerationPort,
  StructuredLlmGenerationRequest,
  StructuredLlmGenerationResult,
} from "../ports/structured-llm-generation/index.js";

interface PrioritizedFinalWord {
  readonly selectedCandidateId: string;
  readonly ranking: readonly {
    readonly candidateId: string;
    readonly reason: string;
  }[];
}

interface V4FinalWordFailureDiagnostics {
  readonly selectedCandidateId?: string;
  readonly appliedFilters?: readonly string[];
  readonly exclusions?: readonly {
    readonly candidateId: string;
    readonly code: string;
    readonly reason: string;
  }[];
}

class CapturingV4FinalWordPrioritizer implements StructuredLlmGenerationPort {
  readonly requests: StructuredLlmGenerationRequest<unknown>[] = [];

  constructor(private readonly output: PrioritizedFinalWord) {}

  async generate<TOutput>(
    request: StructuredLlmGenerationRequest<TOutput>,
  ): Promise<StructuredLlmGenerationResult<TOutput>> {
    this.requests.push(request as StructuredLlmGenerationRequest<unknown>);
    const validation = request.outputSchema.validate(this.output);

    if (!validation.ok) {
      return {
        ok: false,
        error: {
          code: "INVALID_STRUCTURED_OUTPUT",
          message: "Fixture output failed schema validation.",
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
          model: "fixture-v4-selector",
          operation: request.operation,
          prompt: {
            id: request.prompt.id,
            version: request.prompt.version,
          },
          requestId: "fixture-v4-final-word-1",
          completedAt: "2026-08-31T10:00:00.000Z",
          durationMs: 12,
        },
        usage: {
          inputTokens: 40,
          outputTokens: 20,
          totalTokens: 60,
        },
      },
    };
  }
}

const dictionaryVersion = "dictionary-2026-08-30";

const finalWordCandidate = (
  overrides: Partial<V4FinalWordCandidateInput> = {},
): V4FinalWordCandidateInput => ({
  id: "word:dragon",
  word: "dragón",
  lemma: "dragón",
  dictionaryVersion,
  status: "approved",
  tonicity: "aguda",
  category: "sustantivo",
  allowedAsPunchline: true,
  rhymeFamilyId: "family:on",
  rhymePartnerCount: 3,
  semanticTags: ["dragon", "humo", "confusion"],
  ...overrides,
});

const selectionRequest = (
  candidates: readonly V4FinalWordCandidateInput[],
): V4FinalWordSelectionRequest => ({
  dictionaryVersion,
  plan: {
    finalIntent: "Un dragón cree que su humo es perfume elegante.",
    requiredSemanticTags: ["dragon", "humo"],
    preferredCategories: ["sustantivo"],
  },
  candidates,
});

const diagnosticsFor = (error: unknown): V4FinalWordFailureDiagnostics =>
  error as V4FinalWordFailureDiagnostics;

test("prioritizes only approved punchline candidates compatible with the semantic plan", async () => {
  const prioritizer = new CapturingV4FinalWordPrioritizer({
    selectedCandidateId: "word:dragon",
    ranking: [{ candidateId: "word:dragon", reason: "Cierra el remate con el sujeto y el humo." }],
  });

  await selectV4FinalWord(
    selectionRequest([
      finalWordCandidate(),
      finalWordCandidate({
        id: "word:balcon",
        word: "balcón",
        lemma: "balcón",
        allowedAsPunchline: false,
        semanticTags: ["casa"],
      }),
      finalWordCandidate({
        id: "word:ruego",
        word: "ruego",
        lemma: "ruego",
        status: "pending",
        tonicity: "llana",
        rhymeFamilyId: "family:uego",
        semanticTags: ["peticion"],
      }),
      finalWordCandidate({
        id: "word:volcan",
        word: "volcán",
        lemma: "volcán",
        semanticTags: ["montaña", "lava"],
      }),
    ]),
    { prioritizer },
  );

  assert.equal(prioritizer.requests.length, 1);
  assert.deepEqual(prioritizer.requests[0]?.input, {
    dictionaryVersion,
    plan: {
      finalIntent: "Un dragón cree que su humo es perfume elegante.",
      requiredSemanticTags: ["dragon", "humo"],
      preferredCategories: ["sustantivo"],
    },
    candidates: [
      {
        id: "word:dragon",
        word: "dragón",
        lemma: "dragón",
        dictionaryVersion,
        tonicity: "aguda",
        category: "sustantivo",
        rhymeFamilyId: "family:on",
      },
    ],
  });
});

test("accepts a selected candidate ID from the closed list and preserves ranked alternatives", async () => {
  const prioritizer = new CapturingV4FinalWordPrioritizer({
    selectedCandidateId: "word:dragon",
    ranking: [
      { candidateId: "word:dragon", reason: "Expresa directamente el remate del animal confundido." },
      { candidateId: "word:boton", reason: "Puede sostener un giro sobre pulsar sin pensar." },
    ],
  });

  const result = await selectV4FinalWord(
    selectionRequest([
      finalWordCandidate(),
      finalWordCandidate({
        id: "word:boton",
        word: "botón",
        lemma: "botón",
        semanticTags: ["dragon", "humo", "confusion", "objeto"],
      }),
    ]),
    { prioritizer },
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.value.selected, {
    id: "word:dragon",
    word: "dragón",
    lemma: "dragón",
    dictionaryVersion,
    tonicity: "aguda",
    category: "sustantivo",
    rhymeFamilyId: "family:on",
  });
  assert.deepEqual(
    result.value.alternatives.map((candidate) => candidate.id),
    ["word:boton"],
  );
  assert.deepEqual(result.value.reasons, [
    {
      candidateId: "word:dragon",
      reason: "Expresa directamente el remate del animal confundido.",
    },
    {
      candidateId: "word:boton",
      reason: "Puede sostener un giro sobre pulsar sin pensar.",
    },
  ]);
  assert.equal(result.value.dictionaryVersion, dictionaryVersion);
});

test("rejects an invented final word selected outside the offered candidate IDs", async () => {
  const prioritizer = new CapturingV4FinalWordPrioritizer({
    selectedCandidateId: "word:unicornio",
    ranking: [
      {
        candidateId: "word:unicornio",
        reason: "El modelo inventa una palabra vistosa que no estaba en la lista.",
      },
      { candidateId: "word:dragon", reason: "Opcion cerrada que si estaba disponible." },
    ],
  });

  const result = await selectV4FinalWord(
    selectionRequest([
      finalWordCandidate(),
      finalWordCandidate({
        id: "word:boton",
        word: "botón",
        lemma: "botón",
        semanticTags: ["dragon", "humo", "confusion", "objeto"],
      }),
    ]),
    { prioritizer },
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "SELECTED_CANDIDATE_NOT_OFFERED");
  assert.equal(diagnosticsFor(result.error).selectedCandidateId, "word:unicornio");
  assert.deepEqual(
    result.error.candidates.map((candidate) => candidate.id),
    ["word:dragon", "word:boton"],
  );
});

test("stops before LLM prioritization when the input candidate set is empty", async () => {
  const prioritizer = new CapturingV4FinalWordPrioritizer({
    selectedCandidateId: "word:dragon",
    ranking: [{ candidateId: "word:dragon", reason: "No debe consultarse sin candidatas." }],
  });

  const result = await selectV4FinalWord(selectionRequest([]), { prioritizer });

  assert.equal(prioritizer.requests.length, 0);
  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "NO_VIABLE_FINAL_WORD");
  assert.equal(result.error.dictionaryVersion, dictionaryVersion);
  assert.deepEqual(result.error.candidates, []);
  assert.deepEqual(diagnosticsFor(result.error).appliedFilters, [
    "APPROVED_STATUS",
    "PUNCHLINE_PERMISSION",
    "SUPPORTED_TONICITY",
    "VIABLE_RHYME_FAMILY",
    "REQUIRED_SEMANTIC_TAGS",
    "PREFERRED_CATEGORY",
  ]);
  assert.deepEqual(diagnosticsFor(result.error).exclusions, []);
});

test("rejects unsupported stress and candidates without a viable rhyme family with reasons", async () => {
  const prioritizer = new CapturingV4FinalWordPrioritizer({
    selectedCandidateId: "word:dragon",
    ranking: [{ candidateId: "word:dragon", reason: "No debe consultarse sin candidatas viables." }],
  });

  const result = await selectV4FinalWord(
    selectionRequest([
      finalWordCandidate({
        id: "word:brujula",
        word: "brújula",
        lemma: "brújula",
        tonicity: "esdrujula",
      }),
      finalWordCandidate({
        id: "word:solitario",
        word: "solitario",
        lemma: "solitario",
        tonicity: "llana",
        rhymeFamilyId: "family:ario",
        rhymePartnerCount: 0,
      }),
    ]),
    { prioritizer },
  );

  assert.equal(prioritizer.requests.length, 0);
  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "NO_VIABLE_FINAL_WORD");
  assert.deepEqual(result.error.candidates, []);

  const exclusions = diagnosticsFor(result.error).exclusions;
  assert.deepEqual(
    exclusions?.map((exclusion) => [exclusion.candidateId, exclusion.code]),
    [
      ["word:brujula", "UNSUPPORTED_TONICITY"],
      ["word:solitario", "NO_VIABLE_RHYME_FAMILY"],
    ],
  );
  assert.equal(
    exclusions?.every((exclusion) => exclusion.reason.trim().length > 0),
    true,
  );
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  filterV2RhymeWordCandidates,
  selectV2RhymeWord,
  type V2RhymeWordCandidate,
  type V2RhymeWordFilteringRequest,
  type V2RhymeWordSelectionRequest,
} from "./v2-rhyme-word-selection/index.js";
import { FixtureStructuredLlmGenerator } from "../testing/structured-llm-generation-fake.js";

const baseCandidate = (
  overrides: Partial<V2RhymeWordCandidate> = {},
): V2RhymeWordCandidate => ({
  id: "word-juego",
  form: "juego",
  lemma: "juego",
  consonantFamily: "uego",
  category: "sustantivo",
  status: "approved",
  allowedRoles: ["PREPARACION"],
  morphology: {
    kind: "sustantivo",
    signature: "sustantivo:juego",
  },
  semanticTags: ["expectativa", "contraste"],
  ...overrides,
});

const baseRequest = (
  overrides: Partial<V2RhymeWordFilteringRequest> = {},
): V2RhymeWordFilteringRequest => ({
  v4FinalWord: baseCandidate({
    id: "word-fuego",
    form: "fuego",
    lemma: "fuego",
    allowedRoles: ["REMATE"],
    morphology: {
      kind: "sustantivo",
      signature: "sustantivo:fuego",
    },
    semanticTags: ["remate", "sorpresa"],
  }),
  candidates: [],
  requiredRole: "PREPARACION",
  allowedCategories: ["sustantivo"],
  morphologyPolicy: {
    rejectSameLemma: true,
    rejectRepeatingKinds: ["infinitivo", "participio"],
  },
  ...overrides,
});

const semanticOrdering = (
  output: unknown,
  providerRequestId = "fixture-v2-rhyme-word-ordering",
): V2RhymeWordSelectionRequest["semanticOrdering"] => ({
  generator: new FixtureStructuredLlmGenerator([
    {
      operation: "select-v2-rhyme-word",
      output,
      provider: "fixture-provider",
      model: "fixture-structured-v1",
      providerRequestId,
      completedAt: "2026-08-31T14:30:00.000Z",
      durationMs: 17,
      usage: {
        inputTokens: 61,
        outputTokens: 19,
      },
    },
  ]),
  prompt: {
    id: "generation.v2-rhyme-word-selection",
    version: "0.1.0",
    messages: [
      {
        role: "system",
        content: "Ordena solo IDs de candidatas aprobadas para V2.",
      },
    ],
  },
  limits: {
    timeoutMs: 1_000,
    maxOutputTokens: 400,
  },
});

const baseSelectionRequest = (
  overrides: Partial<V2RhymeWordSelectionRequest> = {},
): V2RhymeWordSelectionRequest => ({
  ...baseRequest(),
  semanticOrdering: semanticOrdering({
    selectedCandidateId: "word-juego",
    orderedCandidateIds: ["word-juego"],
    reason: "Prepara el contraste antes del remate.",
  }),
  ...overrides,
});

test("filters V2 rhyme words by consonant family, preparation role, category and approval", () => {
  const result = filterV2RhymeWordCandidates(
    baseRequest({
      candidates: [
        baseCandidate({ id: "word-juego", form: "juego", lemma: "juego" }),
        baseCandidate({
          id: "word-apego",
          form: "apego",
          lemma: "apego",
          consonantFamily: "ego",
        }),
        baseCandidate({
          id: "word-luego",
          form: "luego",
          lemma: "luego",
          category: "adverbio",
          allowedRoles: ["REMATE"],
        }),
        baseCandidate({
          id: "word-ruego",
          form: "ruego",
          lemma: "rogar",
          category: "verbo",
        }),
        baseCandidate({
          id: "word-pliego",
          form: "pliego",
          lemma: "pliego",
          status: "pending",
        }),
      ],
    }),
  );

  assert.deepEqual(
    result.viableCandidates.map((candidate) => candidate.id),
    ["word-juego"],
  );
  assert.deepEqual(
    result.exclusions.map((exclusion) => ({
      candidateId: exclusion.candidate.id,
      codes: exclusion.reasons.map((reason) => reason.code),
    })),
    [
      {
        candidateId: "word-apego",
        codes: ["CONSONANT_FAMILY_MISMATCH"],
      },
      {
        candidateId: "word-luego",
        codes: ["PREPARATION_ROLE_NOT_ALLOWED", "CATEGORY_NOT_ALLOWED"],
      },
      {
        candidateId: "word-ruego",
        codes: ["CATEGORY_NOT_ALLOWED"],
      },
      {
        candidateId: "word-pliego",
        codes: ["WORD_NOT_APPROVED"],
      },
    ],
  );
});

test("rejects morphologically repetitive V2 pairs before semantic ordering", () => {
  const result = filterV2RhymeWordCandidates(
    baseRequest({
      v4FinalWord: baseCandidate({
        id: "word-sentado",
        form: "sentado",
        lemma: "sentar",
        consonantFamily: "ado",
        category: "adjetivo",
        allowedRoles: ["REMATE"],
        morphology: {
          kind: "participio",
          signature: "participio:sentar",
        },
      }),
      candidates: [
        baseCandidate({
          id: "word-tejado",
          form: "tejado",
          lemma: "tejado",
          consonantFamily: "ado",
          morphology: {
            kind: "sustantivo",
            signature: "sustantivo:tejado",
          },
        }),
        baseCandidate({
          id: "word-mojado",
          form: "mojado",
          lemma: "mojar",
          consonantFamily: "ado",
          category: "adjetivo",
          morphology: {
            kind: "participio",
            signature: "participio:mojar",
          },
        }),
        baseCandidate({
          id: "word-sentar",
          form: "sentar",
          lemma: "sentar",
          consonantFamily: "ar",
          category: "verbo",
          morphology: {
            kind: "infinitivo",
            signature: "infinitivo:sentar",
          },
        }),
      ],
      allowedCategories: ["sustantivo", "adjetivo"],
    }),
  );

  assert.deepEqual(
    result.viableCandidates.map((candidate) => candidate.id),
    ["word-tejado"],
  );
  assert.deepEqual(
    result.exclusions.map((exclusion) => ({
      candidateId: exclusion.candidate.id,
      codes: exclusion.reasons.map((reason) => reason.code),
    })),
    [
      {
        candidateId: "word-mojado",
        codes: ["MORPHOLOGICAL_REPETITION_FORBIDDEN"],
      },
      {
        candidateId: "word-sentar",
        codes: [
          "CONSONANT_FAMILY_MISMATCH",
          "CATEGORY_NOT_ALLOWED",
          "LEMMA_REPETITION_FORBIDDEN",
        ],
      },
    ],
  );
});

test("rejects an assonant or filtered-out LLM choice without adding it to the closed list", async () => {
  const result = await selectV2RhymeWord(
    baseSelectionRequest({
      candidates: [
        baseCandidate({ id: "word-juego", form: "juego", lemma: "juego" }),
        baseCandidate({
          id: "word-apego",
          form: "apego",
          lemma: "apego",
          consonantFamily: "ego",
          semanticTags: ["asonante"],
        }),
      ],
      semanticOrdering: semanticOrdering({
        selectedCandidateId: "word-apego",
        orderedCandidateIds: ["word-apego", "word-juego"],
        reason: "Comparte vocales con fuego, pero no la familia consonante.",
      }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_SELECTED_OUT_OF_LIST_CANDIDATE");
  assert.equal(result.error.selectedCandidateId, "word-apego");
  assert.deepEqual(result.error.allowedCandidateIds, ["word-juego"]);
  assert.deepEqual(
    result.error.exclusions.map((exclusion) => ({
      candidateId: exclusion.candidate.id,
      codes: exclusion.reasons.map((reason) => reason.code),
    })),
    [
      {
        candidateId: "word-apego",
        codes: ["CONSONANT_FAMILY_MISMATCH"],
      },
    ],
  );
});

test("rejects an invented LLM candidate ID without adding a dictionary entry", async () => {
  const result = await selectV2RhymeWord(
    baseSelectionRequest({
      candidates: [baseCandidate({ id: "word-juego", form: "juego", lemma: "juego" })],
      semanticOrdering: semanticOrdering({
        selectedCandidateId: "word-bruego",
        orderedCandidateIds: ["word-bruego", "word-juego"],
        reason: "La respuesta inventa una forma que no estaba aprobada.",
      }),
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "LLM_SELECTED_OUT_OF_LIST_CANDIDATE");
  assert.equal(result.error.selectedCandidateId, "word-bruego");
  assert.deepEqual(result.error.allowedCandidateIds, ["word-juego"]);
  assert.deepEqual(
    result.error.exclusions.map((exclusion) => exclusion.candidate.id),
    [],
  );
});

test("fails the branch without asking the LLM when no approved V2 pair survives filters", async () => {
  const result = await selectV2RhymeWord(
    baseSelectionRequest({
      v4FinalWord: baseCandidate({
        id: "word-sentado",
        form: "sentado",
        lemma: "sentar",
        consonantFamily: "ado",
        category: "adjetivo",
        allowedRoles: ["REMATE"],
        morphology: {
          kind: "participio",
          signature: "participio:sentar",
        },
      }),
      candidates: [
        baseCandidate({
          id: "word-mojado",
          form: "mojado",
          lemma: "mojar",
          consonantFamily: "ado",
          category: "adjetivo",
          morphology: {
            kind: "participio",
            signature: "participio:mojar",
          },
        }),
        baseCandidate({
          id: "word-sentar",
          form: "sentar",
          lemma: "sentar",
          consonantFamily: "ar",
          category: "verbo",
          morphology: {
            kind: "infinitivo",
            signature: "infinitivo:sentar",
          },
        }),
      ],
      allowedCategories: ["sustantivo", "adjetivo"],
      semanticOrdering: {
        ...semanticOrdering({
          selectedCandidateId: "word-mojado",
          orderedCandidateIds: ["word-mojado"],
          reason: "This fixture must not be consumed.",
        }),
        generator: new FixtureStructuredLlmGenerator([]),
      },
    }),
  );

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.equal(result.error.code, "NO_VIABLE_V2_RHYME_WORD");
  assert.equal(result.error.v4FinalWordId, "word-sentado");
  assert.deepEqual(
    result.error.exclusions.map((exclusion) => ({
      candidateId: exclusion.candidate.id,
      codes: exclusion.reasons.map((reason) => reason.code),
    })),
    [
      {
        candidateId: "word-mojado",
        codes: ["MORPHOLOGICAL_REPETITION_FORBIDDEN"],
      },
      {
        candidateId: "word-sentar",
        codes: [
          "CONSONANT_FAMILY_MISMATCH",
          "CATEGORY_NOT_ALLOWED",
          "LEMMA_REPETITION_FORBIDDEN",
        ],
      },
    ],
  );
});

test("preserves a deterministic closed-list selection with ordered alternatives", async () => {
  const collectSelection = async (providerRequestId: string) => {
    const result = await selectV2RhymeWord(
      baseSelectionRequest({
        candidates: [
          baseCandidate({ id: "word-ruego", form: "ruego", lemma: "ruego" }),
          baseCandidate({ id: "word-juego", form: "juego", lemma: "juego" }),
          baseCandidate({ id: "word-pliego", form: "pliego", lemma: "pliego" }),
        ],
        semanticOrdering: semanticOrdering(
          {
            selectedCandidateId: "word-juego",
            orderedCandidateIds: ["word-juego", "word-pliego", "word-ruego"],
            reason: "Juego prepara una lectura lúdica antes de fuego.",
          },
          providerRequestId,
        ),
      }),
    );

    if (!result.ok) {
      assert.fail(`Expected a valid V2 selection, got ${result.error.code}.`);
    }

    return {
      selectedId: result.value.selected.id,
      selectedWord: result.value.selected.form,
      family: result.value.consonantFamily,
      category: result.value.category,
      reason: result.value.reason,
      alternatives: result.value.alternatives.map((candidate) => candidate.id),
    };
  };

  const first = await collectSelection("fixture-v2-rhyme-word-ordering-1");
  const second = await collectSelection("fixture-v2-rhyme-word-ordering-2");

  assert.deepEqual(first, {
    selectedId: "word-juego",
    selectedWord: "juego",
    family: "uego",
    category: "sustantivo",
    reason: "Juego prepara una lectura lúdica antes de fuego.",
    alternatives: ["word-pliego", "word-ruego"],
  });
  assert.deepEqual(second, first);
});

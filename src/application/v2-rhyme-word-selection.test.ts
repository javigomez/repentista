import test from "node:test";
import assert from "node:assert/strict";

import {
  filterV2RhymeWordCandidates,
  type V2RhymeWordCandidate,
  type V2RhymeWordFilteringRequest,
} from "./v2-rhyme-word-selection/index.js";

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

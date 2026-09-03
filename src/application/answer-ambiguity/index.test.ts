import test from "node:test";
import assert from "node:assert/strict";

import { detectAnswerAmbiguity } from "./index.js";
import { ambiguityRequest, ambiguityWord } from "./test-fixtures.js";

test("returns the target as the only correct answer when the closed catalog is unique", () => {
  const result = detectAnswerAmbiguity(ambiguityRequest());

  assert.equal(result.status, "VALIDO");
  assert.deepEqual(result.correctAnswers, ["dragón"]);
  assert.deepEqual(result.alternatives, []);
});

test("invalidates a slot when multiple declared answers pass every deterministic filter", () => {
  const result = detectAnswerAmbiguity(
    ambiguityRequest({
      catalog: [
        ambiguityWord(),
        ambiguityWord({ id: "word:balcon", form: "balcón" }),
      ],
    }),
  );

  assert.equal(result.status, "INVALIDO");
  assert.deepEqual(result.correctAnswers, ["dragón", "balcón"]);
  assert.deepEqual(result.alternatives, ["balcón"]);
});

test("reports deterministic exclusions and unresolved alternatives exhaustively", () => {
  const result = detectAnswerAmbiguity(
    ambiguityRequest({
      catalog: [
        ambiguityWord(),
        ambiguityWord({ id: "word:pending", form: "camión", dictionaryVersion: "other" }),
        ambiguityWord({ id: "word:uncertain", form: "razón" }),
      ],
      semanticDecisions: {
        "word:uncertain": "UNRESOLVED",
      },
    }),
  );

  assert.equal(result.status, "DUDOSO");
  assert.deepEqual(result.alternatives, ["razón"]);
  assert.deepEqual(result.exclusions, [
    { candidateId: "word:pending", code: "DICTIONARY_VERSION_MISMATCH" },
  ]);
});

test("is scoped to the explicitly requested dictionary version", () => {
  const result = detectAnswerAmbiguity(
    ambiguityRequest({
      dictionaryVersion: "dictionary-2026-09-01",
      catalog: [ambiguityWord({ dictionaryVersion: "dictionary-2026-08-30" })],
    }),
  );

  assert.equal(result.status, "INVALIDO");
  assert.equal(result.dictionaryVersion, "dictionary-2026-09-01");
  assert.deepEqual(result.correctAnswers, []);
  assert.deepEqual(result.exclusions, [
    { candidateId: "word:dragon", code: "DICTIONARY_VERSION_MISMATCH" },
  ]);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildApprovedConsonantRhymeCatalog,
  type ApprovedConsonantRhymeEntry,
} from "./approved-consonant-rhyme-catalog/index.js";

const entry = (
  word: string,
  category: ApprovedConsonantRhymeEntry["category"],
  phoneticTail: string,
): ApprovedConsonantRhymeEntry => ({
  word,
  lemma: word,
  normalizedForm: word.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase(),
  category,
  stress: word.endsWith("ón") ? "aguda" : "llana",
  phoneticTail,
  status: "approved",
  editorialRoles: ["preparation", "punchline"],
});

const goldEntries = Object.freeze([
  entry("dragón", "noun", "ón"),
  entry("balcón", "noun", "ón"),
  entry("ratón", "noun", "ón"),
  entry("fuego", "noun", "uego"),
  entry("juego", "noun", "uego"),
  entry("luego", "adverb", "uego"),
  entry("ruego", "noun", "uego"),
  entry("tejado", "noun", "ado"),
  entry("mojado", "adjective", "ado"),
  entry("sentado", "adjective", "ado"),
  entry("cuadrado", "adjective", "ado"),
  entry("rima", "noun", "ima"),
  entry("encina", "noun", "ina"),
] satisfies readonly ApprovedConsonantRhymeEntry[]);

test("groups approved words by normalized consonant tail from the last stressed vowel", () => {
  const catalog = buildApprovedConsonantRhymeCatalog({
    dictionaryVersion: "gold-2026-08-30",
    entries: goldEntries,
  });

  assert.deepEqual(catalog.findFamilyByWord("dragón")?.words.map((item) => item.word), [
    "balcón",
    "dragón",
    "ratón",
  ]);
  assert.deepEqual(catalog.findFamilyByWord("fuego")?.words.map((item) => item.word), [
    "fuego",
    "juego",
    "luego",
    "ruego",
  ]);
  assert.deepEqual(catalog.findFamilyByWord("tejado")?.words.map((item) => item.word), [
    "cuadrado",
    "mojado",
    "sentado",
    "tejado",
  ]);
});

test("does not return pairs that are only assonant", () => {
  const catalog = buildApprovedConsonantRhymeCatalog({
    dictionaryVersion: "gold-2026-08-30",
    entries: goldEntries,
  });

  assert.equal(catalog.findFamilyByWord("rima")?.tail.value, "ima");
  assert.equal(catalog.findFamilyByWord("encina")?.tail.value, "ina");
  assert.deepEqual(catalog.findRhymesForWord("rima").map((item) => item.word), []);
  assert.deepEqual(catalog.findRhymesForWord("encina").map((item) => item.word), []);
});

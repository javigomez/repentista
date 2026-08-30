import test from "node:test";
import assert from "node:assert/strict";

import {
  buildApprovedConsonantRhymeCatalog,
  type ApprovedConsonantRhymeEntry,
} from "./approved-consonant-rhyme-catalog/index.js";

type EntryOverrides = Partial<
  Pick<ApprovedConsonantRhymeEntry, "editorialFamily" | "editorialRoles">
>;

const entry = (
  word: string,
  category: ApprovedConsonantRhymeEntry["category"],
  phoneticTail: string,
  overrides: EntryOverrides = {},
): ApprovedConsonantRhymeEntry => ({
  word,
  lemma: word,
  normalizedForm: word.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase(),
  category,
  stress: word.endsWith("ón") ? "aguda" : "llana",
  phoneticTail,
  status: "approved",
  editorialRoles: ["preparation", "punchline"],
  ...overrides,
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

const filteredEntries = Object.freeze([
  entry("dragón", "noun", "ón", { editorialRoles: ["punchline"] }),
  entry("balcón", "noun", "ón", { editorialRoles: ["preparation"] }),
  entry("camión", "noun", "ón", { editorialRoles: ["punchline"] }),
  entry("marrón", "adjective", "ón", { editorialRoles: ["preparation"] }),
] satisfies readonly ApprovedConsonantRhymeEntry[]);

test("filters rhyme candidates by category and editorial role without mutating the catalog", () => {
  const catalog = buildApprovedConsonantRhymeCatalog({
    dictionaryVersion: "gold-2026-08-30",
    entries: filteredEntries,
  });

  assert.deepEqual(
    catalog
      .findRhymesForWord("dragón", {
        categories: ["noun"],
        editorialRoles: ["preparation"],
      })
      .map((item) => item.word),
    ["balcón"],
  );
  assert.deepEqual(
    catalog
      .findRhymesForWord("dragón", {
        categories: ["adjective"],
        editorialRoles: ["preparation"],
      })
      .map((item) => item.word),
    ["marrón"],
  );
  assert.deepEqual(catalog.findFamilyByWord("dragón")?.words.map((item) => item.word), [
    "balcón",
    "camión",
    "dragón",
    "marrón",
  ]);
});

test("explains empty filtered results without inventing rhyme words", () => {
  const catalog = buildApprovedConsonantRhymeCatalog({
    dictionaryVersion: "gold-2026-08-30",
    entries: filteredEntries,
  });

  const result = catalog.explainRhymesForWord("dragón", {
    categories: ["adverb"],
    editorialRoles: ["preparation"],
  });

  assert.deepEqual(result.words.map((item) => item.word), []);
  assert.equal(result.explanation.code, "no-approved-rhyme-after-filters");
  assert.equal(result.explanation.familyTail.value, "on");
  assert.deepEqual(result.explanation.filters, {
    categories: ["adverb"],
    editorialRoles: ["preparation"],
  });
  assert.deepEqual(result.explanation.consideredApprovedWords, [
    "balcón",
    "camión",
    "marrón",
  ]);
});

test("rejects entries whose editorial family conflicts with the phonetic tail", () => {
  assert.throws(
    () =>
      buildApprovedConsonantRhymeCatalog({
        dictionaryVersion: "gold-2026-08-30",
        entries: [
          entry("fuego", "noun", "uego", { editorialFamily: "ego" }),
          entry("juego", "noun", "uego", { editorialFamily: "uego" }),
        ],
      }),
    (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.name, "ApprovedConsonantRhymeCatalogError");
      assert.deepEqual((error as { issues?: unknown }).issues, [
        {
          code: "editorial-family-mismatch",
          word: "fuego",
          phoneticTail: "uego",
          editorialFamily: "ego",
        },
      ]);
      return true;
    },
  );
});

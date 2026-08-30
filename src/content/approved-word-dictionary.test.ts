import test from "node:test";
import assert from "node:assert/strict";

import {
  ApprovedWordDictionaryCreationError,
  createApprovedWord,
  createInMemoryApprovedWordDictionary,
  type ApprovedWordInput,
} from "./approved-word-dictionary/index.js";

const validInput = (overrides: Partial<ApprovedWordInput> = {}): ApprovedWordInput => ({
  version: "dictionary-2026-08-30",
  form: "dragón",
  lemma: "dragón",
  tonicity: "aguda",
  category: "sustantivo",
  level: "basico",
  status: "approved",
  allowedAsPreparation: true,
  allowedAsPunchline: true,
  ...overrides,
});

test("creates an immutable approved dictionary entry from complete editorial data", () => {
  const result = createApprovedWord(validInput());

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.value, {
    version: "dictionary-2026-08-30",
    form: "dragón",
    normalizedForm: "dragon",
    lemma: "dragón",
    normalizedLemma: "dragon",
    tonicity: "aguda",
    category: "sustantivo",
    level: "basico",
    status: "approved",
    allowedAsPreparation: true,
    allowedAsPunchline: true,
  });
  assert.equal(Object.isFrozen(result.value), true);
});

test("normalizes visible and lookup forms without losing the editorial spelling", () => {
  const result = createApprovedWord(
    validInput({
      form: "  Dragón  ",
      lemma: "  Dragón  ",
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.form, "dragón");
  assert.equal(result.value.normalizedForm, "dragon");
  assert.equal(result.value.lemma, "dragón");
  assert.equal(result.value.normalizedLemma, "dragon");
});

test("accepts only aguda and llana tonicities", () => {
  for (const tonicity of ["aguda", "llana"]) {
    const result = createApprovedWord(validInput({ tonicity }));

    assert.equal(result.ok, true, tonicity);
    if (!result.ok) continue;
    assert.equal(result.value.tonicity, tonicity);
  }

  const unsupported = createApprovedWord(validInput({ tonicity: "esdrujula" }));

  assert.equal(unsupported.ok, false);
  if (unsupported.ok) return;
  assert.deepEqual(
    unsupported.errors.map((error) => [error.field, error.code]),
    [["tonicity", "UNSUPPORTED_TONICITY"]],
  );
});

test("keeps preparation and punchline permissions independent", () => {
  const result = createApprovedWord(
    validInput({
      allowedAsPreparation: true,
      allowedAsPunchline: false,
    }),
  );

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.allowedAsPreparation, true);
  assert.equal(result.value.allowedAsPunchline, false);
});

test("rejects incomplete entries with field errors", () => {
  const result = createApprovedWord({
    ...validInput(),
    form: "   ",
    lemma: "",
    category: "   ",
    allowedAsPreparation: "true" as unknown as boolean,
  });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.deepEqual(
    result.errors.map((error) => [error.field, error.code]),
    [
      ["form", "REQUIRED"],
      ["lemma", "REQUIRED"],
      ["category", "REQUIRED"],
      ["allowedAsPreparation", "INVALID_BOOLEAN"],
    ],
  );
});

test("rejects duplicate normalized forms in one dictionary version with field errors", () => {
  assert.throws(
    () =>
      createInMemoryApprovedWordDictionary({
        versions: {
          "dictionary-2026-08-30": [
            validInput({ form: "dragón", lemma: "dragón" }),
            validInput({ form: "Dragon", lemma: "dragon" }),
          ],
        },
      }),
    (error: unknown) => {
      assert.equal(error instanceof ApprovedWordDictionaryCreationError, true);
      if (!(error instanceof ApprovedWordDictionaryCreationError)) return false;

      assert.deepEqual(
        error.errors.map((fieldError) => [fieldError.field, fieldError.code]),
        [["versions.dictionary-2026-08-30[1].form", "DUPLICATE_FORM"]],
      );
      return true;
    },
  );
});

test("finds one approved entry by normalized form within the requested version", () => {
  const dictionary = createInMemoryApprovedWordDictionary({
    versions: {
      "dictionary-2026-08-30": [
        validInput({ form: "dragón", lemma: "dragón", status: "approved" }),
        validInput({ form: "balcón", lemma: "balcón", status: "approved" }),
      ],
    },
  });

  const result = dictionary.findByForm({
    version: "dictionary-2026-08-30",
    form: "  DRAGON ",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.status, "approved");
  assert.equal(result.entry.form, "dragón");
  assert.equal(result.entry.normalizedForm, "dragon");
  assert.equal(result.entry.version, "dictionary-2026-08-30");
  assert.equal(Object.isFrozen(result.entry), true);
});

test("distinguishes a pending entry without treating it as approved", () => {
  const dictionary = createInMemoryApprovedWordDictionary({
    versions: {
      "dictionary-2026-08-30": [
        validInput({
          form: "ruego",
          lemma: "ruego",
          status: "pending",
          allowedAsPreparation: true,
          allowedAsPunchline: false,
        }),
      ],
    },
  });

  const result = dictionary.findByForm({
    version: "dictionary-2026-08-30",
    form: "rúego",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.status, "pending");
  assert.equal(result.entry.form, "ruego");
  assert.equal(result.entry.status, "pending");
});

test("reports missing words in an available version with the normalized lookup form", () => {
  const dictionary = createInMemoryApprovedWordDictionary({
    versions: {
      "dictionary-2026-08-30": [validInput({ form: "dragón", lemma: "dragón" })],
    },
  });

  const result = dictionary.findByForm({
    version: "dictionary-2026-08-30",
    form: "jirafa",
  });

  assert.deepEqual(result, {
    ok: true,
    status: "missing",
    version: "dictionary-2026-08-30",
    normalizedForm: "jirafa",
  });
});

test("reports unavailable dictionary versions without falling back to another snapshot", () => {
  const dictionary = createInMemoryApprovedWordDictionary({
    versions: {
      "dictionary-2026-08-30": [validInput({ form: "dragón", lemma: "dragón" })],
    },
  });

  const result = dictionary.findByForm({
    version: "dictionary-2026-09-01",
    form: "dragón",
  });

  assert.deepEqual(result, {
    ok: false,
    error: {
      code: "DICTIONARY_VERSION_UNAVAILABLE",
      version: "dictionary-2026-09-01",
      availableVersions: ["dictionary-2026-08-30"],
    },
  });
});

test("keeps dictionary snapshots isolated from caller mutations", () => {
  const entries = [validInput({ form: "dragón", lemma: "dragón" })];
  const dictionary = createInMemoryApprovedWordDictionary({
    versions: {
      "dictionary-2026-08-30": entries,
    },
  });

  entries[0] = validInput({ form: "balcón", lemma: "balcón" });

  const result = dictionary.findByForm({
    version: "dictionary-2026-08-30",
    form: "dragón",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.status, "approved");
  assert.equal(result.entry.form, "dragón");
});

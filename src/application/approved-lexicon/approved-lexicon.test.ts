import test from "node:test";
import assert from "node:assert/strict";

import {
  APPROVED_LEXICON_GOLD_FIXTURES,
  APPROVED_LEXICON_GOLD_VERSION,
  approvedWord,
  createLexiconDictionary,
} from "./approved-lexicon-fixtures.js";
import {
  createApprovedLexiconValidator,
  toApprovedLexiconDiagnostic,
  type ApprovedLexiconResult,
  type ApprovedLexiconValidator,
} from "./approved-lexicon.js";

const validatorFor = (): ApprovedLexiconValidator =>
  createApprovedLexiconValidator({
    dictionary: createLexiconDictionary([approvedWord({ form: "dragón", lemma: "dragón" })]),
  });

const goldValidatorFor = (fixture: (typeof APPROVED_LEXICON_GOLD_FIXTURES)[number]): ApprovedLexiconValidator =>
  createApprovedLexiconValidator({ dictionary: createLexiconDictionary(fixture.dictionary) });

test("approved lexicon gold fixtures classify authorized and invalid controlled words", () => {
  for (const fixture of APPROVED_LEXICON_GOLD_FIXTURES) {
    const validator = goldValidatorFor(fixture);
    const result = validator.validate({
      dictionaryVersion: APPROVED_LEXICON_GOLD_VERSION,
      controlledWords: fixture.controlledWords,
    });

    assert.equal(result.ok, true, `${fixture.id}: expected a linguistic result`);
    if (!result.ok) return;

    assert.equal(result.value.verdict, fixture.expected.verdict, fixture.id);

    const codes = result.value.violations.map((violation) => violation.code);
    assert.deepEqual(codes, fixture.expected.violationCodes ?? [], fixture.id);
  }
});

test("gold fixtures cover every violation code and both verdicts", () => {
  const verdicts = new Set<string>();
  const codes = new Set<string>();

  for (const fixture of APPROVED_LEXICON_GOLD_FIXTURES) {
    verdicts.add(fixture.expected.verdict);

    for (const code of fixture.expected.violationCodes ?? []) {
      codes.add(code);
    }
  }

  assert.deepEqual(verdicts, new Set(["VALIDO", "INVALIDO"]));
  assert.deepEqual(codes, new Set(["MISSING_WORD", "PENDING_WORD", "ROLE_NOT_ALLOWED"]));
});

test("authorized words return VALIDO with entry references and the requested version", () => {
  const validator = createApprovedLexiconValidator({
    dictionary: createLexiconDictionary([
      approvedWord({ form: "balcón", lemma: "balcón" }),
      approvedWord({ form: "dragón", lemma: "dragón" }),
    ]),
  });

  const result = validator.validate({
    dictionaryVersion: APPROVED_LEXICON_GOLD_VERSION,
    controlledWords: [
      { slot: "V2", form: "balcón", permission: "PREPARATION" },
      { slot: "V4", form: "dragón", permission: "PUNCHLINE" },
    ],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  const value = result.value as ApprovedLexiconResult;
  assert.equal(value.verdict, "VALIDO");
  assert.equal(value.dictionaryVersion, APPROVED_LEXICON_GOLD_VERSION);
  assert.deepEqual(
    value.checkedWords.map((word) => [word.slot, word.normalizedForm, word.dictionaryVersion]),
    [
      ["V2", "balcon", APPROVED_LEXICON_GOLD_VERSION],
      ["V4", "dragon", APPROVED_LEXICON_GOLD_VERSION],
    ],
  );
  assert.deepEqual(value.violations, []);
});

test("a missing word reports form, slot and missing found status", () => {
  const validator = validatorFor();
  const result = validator.validate({
    dictionaryVersion: APPROVED_LEXICON_GOLD_VERSION,
    controlledWords: [{ slot: "V2", form: "jirafa", permission: "PREPARATION" }],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.verdict, "INVALIDO");
  assert.equal(result.value.violations.length, 1);

  const violation = result.value.violations[0];
  assert.equal(violation.code, "MISSING_WORD");
  assert.equal(violation.form, "jirafa");
  assert.equal(violation.slot, "V2");
  assert.equal(violation.normalizedForm, "jirafa");
  assert.equal(violation.foundStatus, "missing");
});

test("a pending word reports form, slot and pending found status without treating it as approved", () => {
  const validator = createApprovedLexiconValidator({
    dictionary: createLexiconDictionary([
      approvedWord({ form: "ruego", lemma: "ruego", status: "pending" }),
    ]),
  });
  const result = validator.validate({
    dictionaryVersion: APPROVED_LEXICON_GOLD_VERSION,
    controlledWords: [{ slot: "V4", form: "ruego", permission: "PUNCHLINE" }],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.verdict, "INVALIDO");

  const violation = result.value.violations[0];
  assert.equal(violation.code, "PENDING_WORD");
  assert.equal(violation.form, "ruego");
  assert.equal(violation.slot, "V4");
  assert.equal(violation.foundStatus, "pending");
});

test("an approved word missing the required role reports ROLE_NOT_ALLOWED with the permission", () => {
  const validator = createApprovedLexiconValidator({
    dictionary: createLexiconDictionary([
      approvedWord({ form: "dragón", lemma: "dragón", allowedAsPreparation: false, allowedAsPunchline: true }),
    ]),
  });
  const result = validator.validate({
    dictionaryVersion: APPROVED_LEXICON_GOLD_VERSION,
    controlledWords: [{ slot: "V2", form: "dragón", permission: "PREPARATION" }],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.verdict, "INVALIDO");

  const violation = result.value.violations[0];
  assert.equal(violation.code, "ROLE_NOT_ALLOWED");
  assert.equal(violation.foundStatus, "approved");
  assert.equal(violation.requiredPermission, "PREPARATION");
});

test("normalizes lookup forms without accents while preserving the editorial spelling", () => {
  const validator = validatorFor();
  const result = validator.validate({
    dictionaryVersion: APPROVED_LEXICON_GOLD_VERSION,
    controlledWords: [{ slot: "V4", form: "Dragón", permission: "PUNCHLINE" }],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.verdict, "VALIDO");
  assert.deepEqual(
    result.value.checkedWords.map((word) => [word.form, word.normalizedForm]),
    [["Dragón", "dragon"]],
  );
});

test("duplicate controlled word entries are each validated and reported exhaustively", () => {
  const validator = validatorFor();
  const result = validator.validate({
    dictionaryVersion: APPROVED_LEXICON_GOLD_VERSION,
    controlledWords: [
      { slot: "V2", form: "jirafa", permission: "PREPARATION" },
      { slot: "V4", form: "jirafa", permission: "PUNCHLINE" },
    ],
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.verdict, "INVALIDO");
  assert.deepEqual(
    result.value.violations.map((violation) => [violation.slot, violation.code]),
    [
      ["V2", "MISSING_WORD"],
      ["V4", "MISSING_WORD"],
    ],
  );
});

test("an unavailable dictionary version is an operational error, not a linguistic INVALIDO", () => {
  const validator = validatorFor();
  const result = validator.validate({
    dictionaryVersion: "dictionary-2026-09-01",
    controlledWords: [{ slot: "V4", form: "dragón", permission: "PUNCHLINE" }],
  });

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.deepEqual(result.error, {
    code: "DICTIONARY_VERSION_UNAVAILABLE",
    version: "dictionary-2026-09-01",
    availableVersions: [APPROVED_LEXICON_GOLD_VERSION],
  });
});

test("toApprovedLexiconDiagnostic maps verdicts and violations into a candidate diagnostic", () => {
  const validator = createApprovedLexiconValidator({
    dictionary: createLexiconDictionary([approvedWord({ form: "dragón", lemma: "dragón" })]),
  });

  const valid = validator.validate({
    dictionaryVersion: APPROVED_LEXICON_GOLD_VERSION,
    controlledWords: [{ slot: "V4", form: "dragón", permission: "PUNCHLINE" }],
  });
  assert.equal(valid.ok, true);
  if (!valid.ok) return;

  const validDiagnostic = toApprovedLexiconDiagnostic(valid.value);
  assert.equal(validDiagnostic.validator, "approved-lexicon");
  assert.equal(validDiagnostic.result, "VALIDO");
  assert.equal(validDiagnostic.evidence.pointer, `approved-lexicon:${APPROVED_LEXICON_GOLD_VERSION}`);

  const invalid = validator.validate({
    dictionaryVersion: APPROVED_LEXICON_GOLD_VERSION,
    controlledWords: [{ slot: "V2", form: "jirafa", permission: "PREPARATION" }],
  });
  assert.equal(invalid.ok, true);
  if (!invalid.ok) return;

  const invalidDiagnostic = toApprovedLexiconDiagnostic(invalid.value);
  assert.equal(invalidDiagnostic.result, "INVALIDO");
  assert.equal(invalidDiagnostic.evidence.summary, "V2:MISSING_WORD");
});

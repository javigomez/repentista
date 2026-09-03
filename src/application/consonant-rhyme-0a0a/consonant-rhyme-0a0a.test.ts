import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  createConsonantRhymeValidator,
  toConsonantRhymeDiagnostic,
} from "./consonant-rhyme-0a0a.js";
import {
  consonantValue,
  doubtfulValue,
} from "./consonant-rhyme-0a0a-fixtures.js";

describe("consonant rhyme 0-A-0-A", () => {
  it("accepts matching consonant V2/V4 tails and reports family/version", () => {
    const result = createConsonantRhymeValidator().validate({
      dictionaryVersion: "gold-1",
      finals: {
        V1: consonantValue("casa", "asa", "asa"),
        V2: consonantValue("canto", "anto", "anto"),
        V3: consonantValue("mesa", "esa", "esa"),
        V4: consonantValue("manto", "anto", "anto"),
      },
    });
    assert.equal(result.verdict, "VALIDO");
    assert.deepEqual(result.requiredPair.family, "anto");
    assert.equal(result.dictionaryVersion, "gold-1");
  });

  it("rejects assonance when the consonant tail differs", () => {
    const result = createConsonantRhymeValidator().validate({
      dictionaryVersion: "gold-1",
      finals: {
        V2: consonantValue("casa", "a", "asa"),
        V4: consonantValue("rama", "a", "ama"),
      },
    });
    assert.equal(result.verdict, "INVALIDO");
    assert.equal(result.failure?.code, "ASSONANCE_ONLY");
  });

  it("returns doubtful when either final analysis is unknown", () => {
    const result = createConsonantRhymeValidator().validate({
      dictionaryVersion: "gold-1",
      finals: {
        V2: doubtfulValue("???"),
        V4: consonantValue("manto", "anto", "anto"),
      },
    });
    assert.equal(result.verdict, "DUDOSO");
    assert.equal(result.failure?.code, "UNTRUSTED_ANALYSIS");
  });

  it("does not require or reject accidental V1/V3 matches", () => {
    const result = createConsonantRhymeValidator().validate({
      dictionaryVersion: "gold-1",
      finals: {
        V1: consonantValue("canto", "anto", "anto"),
        V2: consonantValue("manto", "anto", "anto"),
        V3: consonantValue("santo", "anto", "anto"),
        V4: consonantValue("tanto", "anto", "anto"),
      },
    });
    assert.equal(result.verdict, "VALIDO");
    assert.deepEqual(result.accidentalMatches, ["V1", "V3"]);
  });
});

describe("toConsonantRhymeDiagnostic", () => {
  it("maps a VALIDO result to a diagnostic with family and tails summary", () => {
    const validator = createConsonantRhymeValidator();
    const result = validator.validate({
      dictionaryVersion: "gold-1",
      finals: {
        V2: consonantValue("canto", "anto", "anto"),
        V4: consonantValue("manto", "anto", "anto"),
      },
    });
    assert.equal(result.verdict, "VALIDO");

    const diagnostic = toConsonantRhymeDiagnostic(result);

    assert.equal(diagnostic.validator, "consonant-rhyme-0a0a");
    assert.equal(diagnostic.version, "consonant-rhyme-validator/0.1.0");
    assert.equal(diagnostic.result, "VALIDO");
    assert.equal(diagnostic.evidence.pointer, "consonant-rhyme-0a0a:gold-1");
    assert.match(
      diagnostic.evidence.summary!,
      /V2↔V4 familia:anto colas:anto,anto/,
    );
  });

  it("maps an ASSONANCE_ONLY rejection to INVALIDO diagnostic with failure code", () => {
    const validator = createConsonantRhymeValidator();
    const result = validator.validate({
      dictionaryVersion: "gold-1",
      finals: {
        V2: consonantValue("casa", "a", "asa"),
        V4: consonantValue("rama", "a", "ama"),
      },
    });
    assert.equal(result.verdict, "INVALIDO");

    const diagnostic = toConsonantRhymeDiagnostic(result);

    assert.equal(diagnostic.result, "INVALIDO");
    assert.match(diagnostic.evidence.summary!, /ASSONANCE_ONLY:casa,rama/);
  });

  it("maps a FAMILY_NOT_APPROVED rejection to INVALIDO diagnostic", () => {
    const validator = createConsonantRhymeValidator();
    const result = validator.validate({
      dictionaryVersion: "gold-1",
      finals: {
        V2: consonantValue("casa", "asa", "asa"),
        V4: consonantValue("perro", "erro", "erro"),
      },
    });
    assert.equal(result.verdict, "INVALIDO");

    const diagnostic = toConsonantRhymeDiagnostic(result);

    assert.equal(diagnostic.result, "INVALIDO");
    assert.match(
      diagnostic.evidence.summary!,
      /FAMILY_NOT_APPROVED:casa,perro/,
    );
  });

  it("maps a DUDOSO result with UNTRUSTED_ANALYSIS failure", () => {
    const validator = createConsonantRhymeValidator();
    const result = validator.validate({
      dictionaryVersion: "gold-1",
      finals: {
        V2: doubtfulValue("???"),
        V4: consonantValue("manto", "anto", "anto"),
      },
    });
    assert.equal(result.verdict, "DUDOSO");

    const diagnostic = toConsonantRhymeDiagnostic(result);

    assert.equal(diagnostic.result, "DUDOSO");
    assert.match(
      diagnostic.evidence.summary!,
      /UNTRUSTED_ANALYSIS:\?\?\?,manto/,
    );
  });

  it("reports accidental V1/V3 matches in the diagnostic summary without affecting verdict", () => {
    const validator = createConsonantRhymeValidator();
    const result = validator.validate({
      dictionaryVersion: "gold-1",
      finals: {
        V1: consonantValue("canto", "anto", "anto"),
        V2: consonantValue("manto", "anto", "anto"),
        V3: consonantValue("santo", "anto", "anto"),
        V4: consonantValue("tanto", "anto", "anto"),
      },
    });
    assert.equal(result.verdict, "VALIDO");

    const diagnostic = toConsonantRhymeDiagnostic(result);

    assert.equal(diagnostic.result, "VALIDO");
    assert.match(
      diagnostic.evidence.summary!,
      /coincidencias accidentales:V1,V3/,
    );
  });

  it("does not include accidental matches section when none exist", () => {
    const validator = createConsonantRhymeValidator();
    const result = validator.validate({
      dictionaryVersion: "gold-1",
      finals: {
        V1: consonantValue("mesa", "esa", "esa"),
        V2: consonantValue("canto", "anto", "anto"),
        V3: consonantValue("ruta", "uta", "uta"),
        V4: consonantValue("manto", "anto", "anto"),
      },
    });
    assert.equal(result.verdict, "VALIDO");

    const diagnostic = toConsonantRhymeDiagnostic(result);

    assert.equal(diagnostic.result, "VALIDO");
    assert.doesNotMatch(
      diagnostic.evidence.summary!,
      /coincidencias accidentales/,
    );
  });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { validateQuatrainStructure } from "./index.js";
import { validQuatrainStructure } from "./test-fixtures.js";

describe("quatrain structure validation", () => {
  describe("complete ordered quatrains", () => {
    it("accepts four non-empty verses with the fixed 0-A-0-A scheme", () => {
      const result = validateQuatrainStructure(validQuatrainStructure());

      assert.equal(result.verdict, "VALIDO");
      assert.deepEqual(result.violations, []);
      assert.deepEqual(result.checks, [
        "FOUR_VERSES",
        "NON_EMPTY_TEXT",
        "ORDERED_ROLES",
        "FIXED_RHYME_SCHEME",
        "PLANNED_FINAL_WORDS",
      ]);
    });

    it("reports empty verse text and an unsupported rhyme scheme", () => {
      const original = validQuatrainStructure();
      const input = {
        ...original,
        rhymeScheme: "ABAB",
        verses: original.verses.map((verse, index) =>
          index === 2 ? { ...verse, text: " " } : verse,
        ),
      };

      const result = validateQuatrainStructure(input);

      assert.equal(result.verdict, "INVALIDO");
      assert.deepEqual(
        result.violations.map(({ code }) => code),
        ["EMPTY_VERSE_TEXT", "UNSUPPORTED_RHYME_SCHEME"],
      );
    });
  });

  describe("missing or extra slots", () => {
    it("rejects a quatrain with only three verses", () => {
      const original = validQuatrainStructure();
      const input = {
        ...original,
        verses: original.verses.slice(0, 3),
      };

      const result = validateQuatrainStructure(input);

      assert.equal(result.verdict, "INVALIDO");
      const countViolation = result.violations.find(
        (v) => v.code === "EXPECTED_FOUR_VERSES",
      );
      assert.ok(countViolation, "Expected EXPECTED_FOUR_VERSES violation");
      assert.equal(countViolation.path, "verses");
    });

    it("rejects a quatrain with five verses", () => {
      const original = validQuatrainStructure();
      const input = {
        ...original,
        verses: [
          ...original.verses,
          {
            slot: "V1" as const,
            role: "PRESENTACION" as const,
            text: "Un verso extra",
          },
        ],
      };

      const result = validateQuatrainStructure(input);

      assert.equal(result.verdict, "INVALIDO");
      const countViolation = result.violations.find(
        (v) => v.code === "EXPECTED_FOUR_VERSES",
      );
      assert.ok(countViolation, "Expected EXPECTED_FOUR_VERSES violation");
    });

    it("rejects a quatrain with zero verses", () => {
      const input = {
        ...validQuatrainStructure(),
        verses: [],
      };

      const result = validateQuatrainStructure(input);

      assert.equal(result.verdict, "INVALIDO");
      const countViolation = result.violations.find(
        (v) => v.code === "EXPECTED_FOUR_VERSES",
      );
      assert.ok(countViolation, "Expected EXPECTED_FOUR_VERSES violation");
    });
  });

  describe("role order violations", () => {
    it("rejects verses when roles are swapped", () => {
      const original = validQuatrainStructure();
      const input = {
        ...original,
        verses: [
          { ...original.verses[0], role: "PREPARACION" as const },
          { ...original.verses[1], role: "PRESENTACION" as const },
          original.verses[2],
          original.verses[3],
        ],
      };

      const result = validateQuatrainStructure(input);

      assert.equal(result.verdict, "INVALIDO");
      const roleViolations = result.violations.filter(
        (v) => v.code === "INVALID_VERSE_ROLE",
      );
      assert.ok(
        roleViolations.length >= 2,
        "Expected at least two INVALID_VERSE_ROLE violations",
      );
      assert.equal(roleViolations[0].path, "verses[0].role");
      assert.equal(roleViolations[1].path, "verses[1].role");
    });

    it("rejects verses when slot order is scrambled", () => {
      const original = validQuatrainStructure();
      const input = {
        ...original,
        verses: [
          original.verses[2], // V3 at position 0
          original.verses[1], // V2 at position 1
          original.verses[0], // V1 at position 2
          original.verses[3], // V4 at position 3
        ],
      };

      const result = validateQuatrainStructure(input);

      assert.equal(result.verdict, "INVALIDO");
      const orderViolations = result.violations.filter(
        (v) => v.code === "INVALID_VERSE_ORDER",
      );
      assert.ok(
        orderViolations.length >= 1,
        "Expected INVALID_VERSE_ORDER violations",
      );
    });
  });

  describe("punctuation-terminal handling", () => {
    it("accepts V2 and V4 endings that match planned words ignoring trailing punctuation", () => {
      const original = validQuatrainStructure();
      const input = {
        ...original,
        verses: [
          original.verses[0],
          { ...original.verses[1], text: "Promete el melón." },
          original.verses[2],
          { ...original.verses[3], text: "Y guarda el jamón!" },
        ],
      };

      const result = validateQuatrainStructure(input);

      assert.equal(result.verdict, "VALIDO");
      assert.deepEqual(result.violations, []);
    });

    it("accepts V2 and V4 endings with trailing comma", () => {
      const original = validQuatrainStructure();
      const input = {
        ...original,
        verses: [
          original.verses[0],
          { ...original.verses[1], text: "Promete el melón," },
          original.verses[2],
          { ...original.verses[3], text: "Y guarda el jamón;" },
        ],
      };

      const result = validateQuatrainStructure(input);

      assert.equal(result.verdict, "VALIDO");
      assert.deepEqual(result.violations, []);
    });
  });

  describe("changed V2/V4 endings", () => {
    it("rejects V2 when it does not end with the planned final word", () => {
      const original = validQuatrainStructure();
      const input = {
        ...original,
        verses: [
          original.verses[0],
          { ...original.verses[1], text: "Promete la sandía" },
          original.verses[2],
          original.verses[3],
        ],
      };

      const result = validateQuatrainStructure(input);

      assert.equal(result.verdict, "INVALIDO");
      const mismatch = result.violations.find(
        (v) => v.code === "PLANNED_FINAL_WORD_MISMATCH",
      );
      assert.ok(mismatch, "Expected PLANNED_FINAL_WORD_MISMATCH violation");
      assert.equal(mismatch.path, "verses[1].text");
    });

    it("rejects V4 when it does not end with the planned final word", () => {
      const original = validQuatrainStructure();
      const input = {
        ...original,
        verses: [
          original.verses[0],
          original.verses[1],
          original.verses[2],
          { ...original.verses[3], text: "Y guarda el chorizo" },
        ],
      };

      const result = validateQuatrainStructure(input);

      assert.equal(result.verdict, "INVALIDO");
      const mismatch = result.violations.find(
        (v) => v.code === "PLANNED_FINAL_WORD_MISMATCH",
      );
      assert.ok(mismatch, "Expected PLANNED_FINAL_WORD_MISMATCH violation");
      assert.equal(mismatch.path, "verses[3].text");
    });

    it("rejects both V2 and V4 when both endings are changed", () => {
      const original = validQuatrainStructure();
      const input = {
        ...original,
        verses: [
          original.verses[0],
          { ...original.verses[1], text: "Promete la sandía" },
          original.verses[2],
          { ...original.verses[3], text: "Y guarda el chorizo" },
        ],
      };

      const result = validateQuatrainStructure(input);

      assert.equal(result.verdict, "INVALIDO");
      const mismatches = result.violations.filter(
        (v) => v.code === "PLANNED_FINAL_WORD_MISMATCH",
      );
      assert.equal(
        mismatches.length,
        2,
        "Expected two PLANNED_FINAL_WORD_MISMATCH violations",
      );
    });

    it("does not report mismatch for V1 and V3 which have no planned endings", () => {
      const original = validQuatrainStructure();
      const input = {
        ...original,
        verses: [
          { ...original.verses[0], text: "Texto diferente" },
          original.verses[1],
          { ...original.verses[2], text: "Otro texto distinto" },
          original.verses[3],
        ],
      };

      const result = validateQuatrainStructure(input);

      assert.equal(result.verdict, "VALIDO");
      const mismatches = result.violations.filter(
        (v) => v.code === "PLANNED_FINAL_WORD_MISMATCH",
      );
      assert.equal(
        mismatches.length,
        0,
        "V1 and V3 should not trigger planned word checks",
      );
    });
  });
});

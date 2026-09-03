import assert from "node:assert/strict";
import test from "node:test";

import { createWeiweiSilabacionWordAnalyzer } from "../../infrastructure/weiwei-silabacion/word-analysis-adapter.js";
import { createOctonolMeterValidator } from "../octonol-meter/octonol-meter.js";
import {
  createMetricVerseRepairPrompt,
  repairMetricVerse,
  type MetricVerseRepairVariant,
} from "./index.js";

const validator = createOctonolMeterValidator({
  analyzer: createWeiweiSilabacionWordAnalyzer(),
});

function context(overrides: Partial<Parameters<typeof repairMetricVerse>[0]> = {}) {
  return {
    candidateId: "candidate-001",
    slot: "V2" as const,
    role: "PREPARACION" as const,
    verse: "la casa de la luna llena",
    finalWord: "llena",
    semanticAnchor: "promete guardar pan para otro",
    scansion: validator.validate("la casa de la luna llena"),
    ...overrides,
  };
}

test("diagnoses the exact metric difference and accepts a repaired same-slot verse", async () => {
  const original = context();
  const variant: MetricVerseRepairVariant = {
    slot: "V2",
    role: original.role,
    verse: "casa de la luna llena",
    semanticAnchor: original.semanticAnchor,
    finalWord: "llena",
  };

  const result = await repairMetricVerse(original, {
    maxAttempts: 1,
    requestVariants: async (request) => {
      assert.equal(request.slot, "V2");
      assert.equal(request.difference, 1);
      assert.equal(request.finalWord, "llena");
      return [variant];
    },
    validate: validator.validate,
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected repair");
  assert.equal(result.value.revision.originalVerse, original.verse);
  assert.equal(result.value.revision.verse, variant.verse);
  assert.equal(result.value.revision.slot, original.slot);
  assert.equal(result.value.revision.role, original.role);
  assert.equal(result.value.revision.finalWord, original.finalWord);
  assert.equal(result.value.scansion.verdict, "VALIDO");
  assert.equal(result.value.attempts, 1);
  assert.match(createMetricVerseRepairPrompt().messages[0]?.content ?? "", /siete posiciones/);
});

test("reports a negative difference for a verse that is too short", async () => {
  const short = context({ verse: "casa de la luna", scansion: validator.validate("casa de la luna") });
  const result = await repairMetricVerse(short, {
    maxAttempts: 0,
    requestVariants: async () => [],
    validate: validator.validate,
  });

  assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected exhausted repair");
  assert.equal(result.error.code, "NO_VALID_REPAIR");
  assert.equal(result.error.difference, -2);
});

test("rejects changed finals and semantic drift before trusting an LLM validity claim", async () => {
  const original = context();
  const result = await repairMetricVerse(original, {
    maxAttempts: 1,
    requestVariants: async () => [
      { slot: original.slot, role: original.role, verse: "casa de la luna camino", finalWord: "camino", semanticAnchor: "sentido distinto" },
      { slot: original.slot, role: original.role, verse: "casa de la luna llena", finalWord: original.finalWord, semanticAnchor: original.semanticAnchor },
    ],
    validate: validator.validate,
  });

  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Expected second variant to be accepted");
  assert.equal(result.value.revision.finalWord, original.finalWord);
  assert.equal(result.value.revision.semanticAnchor, original.semanticAnchor);
});

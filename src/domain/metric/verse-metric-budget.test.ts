import test from "node:test";
import assert from "node:assert/strict";

import {
  ALLOWED_FINAL_STRESS_KINDS,
  VERSE_METRIC_BUDGET_POLICY_VERSION,
  calculateMetricBudgetPlan,
  calculateVerseMetricBudget,
  type FinalWordMetric,
  type MetricBudgetHintKind,
} from "./verse-metric-budget.js";

const trusted = (
  form: string,
  syllableCount: number,
  stressedSyllableIndex: number,
  stressKind: "AGUDA" | "LLANA",
): FinalWordMetric =>
  Object.freeze({
    ok: true,
    form,
    syllableCount,
    stressedSyllableIndex,
    stressKind,
  });

const untrusted = (form: string, reason: string): FinalWordMetric =>
  Object.freeze({ ok: false, form, reason });

test("derives an exact budget for a known aguda final word", () => {
  const budget = calculateVerseMetricBudget({
    slot: "V4",
    targetPositions: 7,
    finalWord: trusted("dragón", 2, 1, "AGUDA"),
  });

  assert.equal(budget.policyVersion, VERSE_METRIC_BUDGET_POLICY_VERSION);
  assert.equal(budget.slot, "V4");
  assert.equal(budget.targetPositions, 7);
  assert.equal(budget.hasFixedEnding, true);
  assert.equal(budget.confidence, "ALTA");
  assert.deepEqual(budget.allowedEndingKinds, ["AGUDA"]);
  assert.equal(budget.finalWordForm, "dragón");
  assert.equal(budget.finalWordStressKind, "AGUDA");
  assert.equal(budget.finalWordSyllableCount, 2);
  assert.equal(budget.finalWordStressedSyllableIndex, 1);
  assert.equal(budget.advisorySpaceBeforeFinalTonic, 5);
});

test("derives an exact budget for a known llana final word", () => {
  const budget = calculateVerseMetricBudget({
    slot: "V4",
    targetPositions: 7,
    finalWord: trusted("casa", 2, 0, "LLANA"),
  });

  assert.equal(budget.confidence, "ALTA");
  assert.deepEqual(budget.allowedEndingKinds, ["LLANA"]);
  assert.equal(budget.finalWordStressKind, "LLANA");
  assert.equal(budget.finalWordStressedSyllableIndex, 0);
  assert.equal(budget.advisorySpaceBeforeFinalTonic, 6);
});

test("returns the global target and allowed endings for slots without a fixed ending", () => {
  for (const slot of ["V1", "V3"] as const) {
    const budget = calculateVerseMetricBudget({ slot, targetPositions: 7 });

    assert.equal(budget.slot, slot);
    assert.equal(budget.hasFixedEnding, false, slot);
    assert.equal(budget.targetPositions, 7, slot);
    assert.deepEqual(budget.allowedEndingKinds, ALLOWED_FINAL_STRESS_KINDS, slot);
    assert.equal(budget.finalWordForm, undefined, slot);
    assert.equal(budget.finalWordStressKind, undefined, slot);
    assert.equal(budget.advisorySpaceBeforeFinalTonic, undefined, slot);
  }
});

test("keeps exact fields separate from advisory hints", () => {
  const budget = calculateVerseMetricBudget({
    slot: "V2",
    targetPositions: 7,
    finalWord: trusted("fuego", 2, 0, "LLANA"),
  });

  assert.equal(budget.advisorySpaceBeforeFinalTonic, 6);
  assert.equal(budget.advisory, true);

  const hintKinds = new Set<MetricBudgetHintKind>(budget.hints.map((hint) => hint.kind));
  assert.ok(hintKinds.has("POSSIBLE_SINALEFA"));
  assert.ok(hintKinds.has("PROHIBITED_LICENSE_DIERESIS"));
  assert.ok(hintKinds.has("PROHIBITED_LICENSE_SINERESIS"));
  assert.ok(hintKinds.has("PROHIBITED_LICENSE_FORCED_HIATUS"));

  for (const hint of budget.hints) {
    assert.notEqual(hint.message.trim(), "");
  }
});

test("marks a budget as doubtful when the final word analysis is untrusted", () => {
  const budget = calculateVerseMetricBudget({
    slot: "V4",
    targetPositions: 7,
    finalWord: untrusted("esdrújula", "unsupported stress kind"),
  });

  assert.equal(budget.hasFixedEnding, true);
  assert.equal(budget.confidence, "DUDOSA");
  assert.equal(budget.finalWordForm, "esdrújula");
  assert.equal(budget.finalWordStressKind, undefined);
  assert.equal(budget.finalWordSyllableCount, undefined);
  assert.equal(budget.advisorySpaceBeforeFinalTonic, undefined);
  assert.deepEqual(budget.allowedEndingKinds, ALLOWED_FINAL_STRESS_KINDS);
});

test("never assumes prohibited licenses and warns when space is insufficient", () => {
  const budget = calculateVerseMetricBudget({
    slot: "V4",
    targetPositions: 7,
    // An 8-syllable aguda word: 8 counted syllables against 7 positions.
    finalWord: trusted("extremadamente", 8, 7, "AGUDA"),
  });

  const hintKinds = new Set<MetricBudgetHintKind>(budget.hints.map((hint) => hint.kind));
  assert.ok(hintKinds.has("INSUFFICIENT_SPACE"));
  assert.ok(hintKinds.has("PROHIBITED_LICENSE_DIERESIS"));
  assert.equal(budget.advisorySpaceBeforeFinalTonic, -1);
  assert.equal(budget.advisory, true);
});

test("plans a budget for every verse slot from fixed words", () => {
  const plan = calculateMetricBudgetPlan({
    targetPositions: 7,
    finalWords: {
      V2: trusted("fuego", 2, 0, "LLANA"),
      V4: trusted("dragón", 2, 1, "AGUDA"),
    },
  });

  assert.equal(plan.policyVersion, VERSE_METRIC_BUDGET_POLICY_VERSION);
  assert.equal(plan.targetPositions, 7);
  assert.deepEqual(Object.keys(plan.budgets).sort(), ["V1", "V2", "V3", "V4"]);

  assert.equal(plan.budgets.V1.hasFixedEnding, false);
  assert.equal(plan.budgets.V2.hasFixedEnding, true);
  assert.equal(plan.budgets.V3.hasFixedEnding, false);
  assert.equal(plan.budgets.V4.hasFixedEnding, true);

  assert.equal(plan.budgets.V2.finalWordStressKind, "LLANA");
  assert.equal(plan.budgets.V4.finalWordStressKind, "AGUDA");
});

test("every planned budget is advisory and never certifies a valid verse", () => {
  const plan = calculateMetricBudgetPlan({ targetPositions: 7 });

  for (const budget of Object.values(plan.budgets)) {
    assert.equal(budget.advisory, true);
    assert.equal("valid" in budget, false);
    assert.equal("isValid" in budget, false);
  }
});

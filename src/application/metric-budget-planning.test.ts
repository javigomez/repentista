import test from "node:test";
import assert from "node:assert/strict";

import type {
  TrustedWordAnalysis,
  UntrustedWordAnalysis,
  WordAnalysisVersions,
} from "../ports/index.js";
import {
  planMetricBudgets,
  toFinalWordMetric,
} from "./metric-budget-planning/index.js";

const versions: WordAnalysisVersions = Object.freeze({
  adapter: "test-adapter/0.1.0",
  library: "test-lib/0.1.0",
});

const trustedAnalysis = (
  form: string,
  syllables: readonly string[],
  stressedSyllableIndex: number,
  stressKind: "aguda" | "llana",
): TrustedWordAnalysis =>
  Object.freeze({
    ok: true,
    form,
    syllables: Object.freeze([...syllables]),
    stressedSyllableIndex,
    stressKind,
    phenomena: Object.freeze({ diphthongs: [], hiatuses: [], triphthongs: [] }),
    versions,
  });

const untrustedAnalysis = (form: string, code: "UNSUPPORTED_STRESS_KIND"): UntrustedWordAnalysis =>
  Object.freeze({
    ok: false,
    form,
    error: Object.freeze({ code, message: "unsupported stress kind" }),
    versions,
  });

test("maps a trusted word analysis into pure final word metrics", () => {
  const metric = toFinalWordMetric("dragón", trustedAnalysis("dragón", ["dra", "gón"], 1, "aguda"));

  assert.equal(metric.ok, true);
  if (!metric.ok) return;

  assert.deepEqual(metric, {
    ok: true,
    form: "dragón",
    syllableCount: 2,
    stressedSyllableIndex: 1,
    stressKind: "AGUDA",
  });
});

test("maps an untrusted word analysis into an untrusted final word metric", () => {
  const metric = toFinalWordMetric("esdrújula", untrustedAnalysis("esdrújula", "UNSUPPORTED_STRESS_KIND"));

  assert.equal(metric.ok, false);
  if (metric.ok) return;

  assert.equal(metric.form, "esdrújula");
  assert.match(metric.reason, /UNSUPPORTED_STRESS_KIND/);
});

test("plans per-slot budgets from fixed V2/V4 endings", () => {
  const plan = planMetricBudgets({
    targetPositions: 7,
    slots: [
      { slot: "V1" },
      {
        slot: "V2",
        fixedEnding: {
          form: "fuego",
          analysis: trustedAnalysis("fuego", ["fue", "go"], 0, "llana"),
        },
      },
      { slot: "V3" },
      {
        slot: "V4",
        fixedEnding: {
          form: "dragón",
          analysis: trustedAnalysis("dragón", ["dra", "gón"], 1, "aguda"),
        },
      },
    ],
  });

  assert.equal(plan.targetPositions, 7);
  assert.equal(plan.budgets.V1.hasFixedEnding, false);
  assert.equal(plan.budgets.V3.hasFixedEnding, false);
  assert.equal(plan.budgets.V2.finalWordStressKind, "LLANA");
  assert.equal(plan.budgets.V2.advisorySpaceBeforeFinalTonic, 6);
  assert.equal(plan.budgets.V4.finalWordStressKind, "AGUDA");
  assert.equal(plan.budgets.V4.advisorySpaceBeforeFinalTonic, 5);
});

test("keeps a doubtful budget for an unanalyzable fixed ending", () => {
  const plan = planMetricBudgets({
    targetPositions: 7,
    slots: [
      {
        slot: "V4",
        fixedEnding: {
          form: "esdrújula",
          analysis: untrustedAnalysis("esdrújula", "UNSUPPORTED_STRESS_KIND"),
        },
      },
    ],
  });

  assert.equal(plan.budgets.V4.hasFixedEnding, true);
  assert.equal(plan.budgets.V4.confidence, "DUDOSA");
  assert.equal(plan.budgets.V4.advisorySpaceBeforeFinalTonic, undefined);
  assert.equal(plan.budgets.V4.advisory, true);
});

test("no planned budget can mark a verse valid", () => {
  const plan = planMetricBudgets({ targetPositions: 7, slots: [] });

  for (const budget of Object.values(plan.budgets)) {
    assert.equal(budget.advisory, true);
    assert.equal("valid" in budget, false);
  }
});

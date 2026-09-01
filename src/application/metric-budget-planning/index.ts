import type { WordAnalysisResult } from "../../ports/index.js";
import {
  calculateMetricBudgetPlan,
  type FinalWordMetric,
  type FinalWordStressKind,
  type MetricBudgetPlan,
  type VerseSlotId,
} from "../../domain/metric/verse-metric-budget.js";

export interface MetricBudgetSlotFixedEnding {
  readonly form: string;
  readonly analysis: WordAnalysisResult;
}

export interface MetricBudgetSlotRequest {
  readonly slot: VerseSlotId;
  readonly fixedEnding?: MetricBudgetSlotFixedEnding;
}

export interface MetricBudgetPlanningRequest {
  readonly targetPositions: number;
  readonly slots: readonly MetricBudgetSlotRequest[];
}

/** Adapta el resultado de análisis de palabra (puerto) al tipo puro de dominio. */
export function toFinalWordMetric(form: string, analysis: WordAnalysisResult): FinalWordMetric {
  if (!analysis.ok) {
    return Object.freeze({
      ok: false as const,
      form,
      reason: `${analysis.error.code}: ${analysis.error.message}`,
    });
  }

  return Object.freeze({
    ok: true as const,
    form,
    syllableCount: analysis.syllables.length,
    stressedSyllableIndex: analysis.stressedSyllableIndex,
    stressKind: toFinalWordStressKind(analysis.stressKind),
  });
}

/** Integra presupuestos métricos orientativos en los slots planificados. */
export function planMetricBudgets(request: MetricBudgetPlanningRequest): MetricBudgetPlan {
  const finalWords: Partial<Record<VerseSlotId, FinalWordMetric>> = {};

  for (const slot of request.slots) {
    if (slot.fixedEnding === undefined) {
      continue;
    }

    finalWords[slot.slot] = toFinalWordMetric(
      slot.fixedEnding.form,
      slot.fixedEnding.analysis,
    );
  }

  return calculateMetricBudgetPlan({
    targetPositions: request.targetPositions,
    finalWords,
  });
}

function toFinalWordStressKind(kind: "aguda" | "llana"): FinalWordStressKind {
  return kind === "aguda" ? "AGUDA" : "LLANA";
}

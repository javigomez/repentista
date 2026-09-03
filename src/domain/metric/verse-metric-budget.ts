export const VERSE_METRIC_BUDGET_POLICY_VERSION = "verse-metric-budget-0.1.0";

export type VerseSlotId = "V1" | "V2" | "V3" | "V4";
export type FinalWordStressKind = "AGUDA" | "LLANA";
export type MetricBudgetConfidence = "ALTA" | "DUDOSA";

export const ALLOWED_FINAL_STRESS_KINDS: readonly FinalWordStressKind[] = Object.freeze([
  "AGUDA",
  "LLANA",
]);

export const ALL_VERSE_SLOTS: readonly VerseSlotId[] = Object.freeze(["V1", "V2", "V3", "V4"]);

/**
 * Advertencias orientativas que el prompt debe preservar. Nunca convierten un
 * presupuesto en una certificación del verso final.
 */
export type MetricBudgetHintKind =
  | "POSSIBLE_SINALEFA"
  | "PROHIBITED_LICENSE_DIERESIS"
  | "PROHIBITED_LICENSE_SINERESIS"
  | "PROHIBITED_LICENSE_FORCED_HIATUS"
  | "INSUFFICIENT_SPACE";

export interface MetricBudgetHint {
  readonly kind: MetricBudgetHintKind;
  readonly message: string;
}

/** Métricas de una palabra final cuyo análisis es confiable. */
export interface TrustedFinalWordMetric {
  readonly ok: true;
  readonly form: string;
  readonly syllableCount: number;
  readonly stressedSyllableIndex: number;
  readonly stressKind: FinalWordStressKind;
}

/** Métricas de una palabra final cuyo análisis no es confiable. */
export interface UntrustedFinalWordMetric {
  readonly ok: false;
  readonly form: string;
  readonly reason: string;
}

export type FinalWordMetric = TrustedFinalWordMetric | UntrustedFinalWordMetric;

/**
 * Presupuesto métrico orientativo para un slot. Solo lleva datos exactos cuando
 * existe final obligatorio y su análisis es confiable; en cualquier caso es
 * ayuda para redactar, nunca una marca de validez.
 */
export interface VerseMetricBudget {
  readonly policyVersion: typeof VERSE_METRIC_BUDGET_POLICY_VERSION;
  readonly slot: VerseSlotId;
  readonly targetPositions: number;
  readonly hasFixedEnding: boolean;
  readonly confidence: MetricBudgetConfidence;
  readonly allowedEndingKinds: readonly FinalWordStressKind[];
  readonly finalWordForm?: string;
  readonly finalWordStressKind?: FinalWordStressKind;
  readonly finalWordSyllableCount?: number;
  readonly finalWordStressedSyllableIndex?: number;
  readonly advisorySpaceBeforeFinalTonic?: number;
  readonly hints: readonly MetricBudgetHint[];
  readonly advisory: true;
}

export interface VerseMetricBudgetInput {
  readonly slot: VerseSlotId;
  readonly targetPositions: number;
  readonly finalWord?: FinalWordMetric;
}

export interface MetricBudgetPlan {
  readonly policyVersion: typeof VERSE_METRIC_BUDGET_POLICY_VERSION;
  readonly targetPositions: number;
  readonly budgets: Readonly<Record<VerseSlotId, VerseMetricBudget>>;
}

export interface MetricBudgetPlanInput {
  readonly targetPositions: number;
  readonly finalWords?: Readonly<Partial<Record<VerseSlotId, FinalWordMetric>>>;
}

const PROHIBITED_LICENSE_HINTS: readonly MetricBudgetHint[] = Object.freeze([
  {
    kind: "PROHIBITED_LICENSE_DIERESIS",
    message: "No asumir diéresis poética para cuadrar el verso.",
  },
  {
    kind: "PROHIBITED_LICENSE_SINERESIS",
    message: "No asumir sinéresis forzada para cuadrar el verso.",
  },
  {
    kind: "PROHIBITED_LICENSE_FORCED_HIATUS",
    message: "No asumir hiato artificial para cuadrar el verso.",
  },
]);

const POSSIBLE_SINALEFA_HINT: MetricBudgetHint = Object.freeze({
  kind: "POSSIBLE_SINALEFA",
  message: "El límite anterior a la palabra final puede formar sinalefa; el margen es orientativo.",
});

const INSUFFICIENT_SPACE_HINT: MetricBudgetHint = Object.freeze({
  kind: "INSUFFICIENT_SPACE",
  message: "La palabra final por sí sola excede las posiciones disponibles antes de la tónica.",
});

const freezeHints = (hints: readonly MetricBudgetHint[]): readonly MetricBudgetHint[] =>
  Object.freeze([...hints]);

const freezeEndingKinds = (
  kinds: readonly FinalWordStressKind[],
): readonly FinalWordStressKind[] => Object.freeze([...kinds]);

export function calculateVerseMetricBudget(input: VerseMetricBudgetInput): VerseMetricBudget {
  const finalWord = input.finalWord;

  if (finalWord === undefined) {
    return Object.freeze({
      policyVersion: VERSE_METRIC_BUDGET_POLICY_VERSION,
      slot: input.slot,
      targetPositions: input.targetPositions,
      hasFixedEnding: false,
      confidence: "ALTA" as const,
      allowedEndingKinds: ALLOWED_FINAL_STRESS_KINDS,
      hints: freezeHints(PROHIBITED_LICENSE_HINTS),
      advisory: true as const,
    });
  }

  if (!finalWord.ok) {
    return Object.freeze({
      policyVersion: VERSE_METRIC_BUDGET_POLICY_VERSION,
      slot: input.slot,
      targetPositions: input.targetPositions,
      hasFixedEnding: true,
      confidence: "DUDOSA" as const,
      allowedEndingKinds: ALLOWED_FINAL_STRESS_KINDS,
      finalWordForm: finalWord.form,
      hints: freezeHints(PROHIBITED_LICENSE_HINTS),
      advisory: true as const,
    });
  }

  const countedSyllables = finalWord.stressedSyllableIndex + 1;
  const advisorySpaceBeforeFinalTonic = input.targetPositions - countedSyllables;
  const hints = [...PROHIBITED_LICENSE_HINTS, POSSIBLE_SINALEFA_HINT];

  if (advisorySpaceBeforeFinalTonic < 0) {
    hints.push(INSUFFICIENT_SPACE_HINT);
  }

  return Object.freeze({
    policyVersion: VERSE_METRIC_BUDGET_POLICY_VERSION,
    slot: input.slot,
    targetPositions: input.targetPositions,
    hasFixedEnding: true,
    confidence: "ALTA" as const,
    allowedEndingKinds: freezeEndingKinds([finalWord.stressKind]),
    finalWordForm: finalWord.form,
    finalWordStressKind: finalWord.stressKind,
    finalWordSyllableCount: finalWord.syllableCount,
    finalWordStressedSyllableIndex: finalWord.stressedSyllableIndex,
    advisorySpaceBeforeFinalTonic,
    hints: freezeHints(hints),
    advisory: true as const,
  });
}

export function calculateMetricBudgetPlan(input: MetricBudgetPlanInput): MetricBudgetPlan {
  const budgets: Record<VerseSlotId, VerseMetricBudget> = {
    V1: calculateVerseMetricBudget({ slot: "V1", targetPositions: input.targetPositions, finalWord: input.finalWords?.V1 }),
    V2: calculateVerseMetricBudget({ slot: "V2", targetPositions: input.targetPositions, finalWord: input.finalWords?.V2 }),
    V3: calculateVerseMetricBudget({ slot: "V3", targetPositions: input.targetPositions, finalWord: input.finalWords?.V3 }),
    V4: calculateVerseMetricBudget({ slot: "V4", targetPositions: input.targetPositions, finalWord: input.finalWords?.V4 }),
  };

  return Object.freeze({
    policyVersion: VERSE_METRIC_BUDGET_POLICY_VERSION,
    targetPositions: input.targetPositions,
    budgets: Object.freeze(budgets),
  });
}

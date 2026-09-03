import type { OctonolMeterResult } from "../octonol-meter/octonol-meter.js";

export const METRIC_VERSE_REPAIR_PROMPT = Object.freeze({
  id: "generation.metric-verse-repair",
  version: "0.1.0",
  messages: Object.freeze([
    Object.freeze({
      role: "system" as const,
      content: "Repara únicamente el verso indicado hasta obtener exactamente siete posiciones métricas. No cambies la palabra final ni inventes licencias poéticas.",
    }),
    Object.freeze({
      role: "user" as const,
      content: "Conserva el rol y el ancla semántica. Devuelve variantes del mismo slot; el validador duro decidirá si alguna es válida.",
    }),
  ]),
});

export interface MetricVerseRepairContext {
  readonly candidateId: string;
  readonly slot: "V1" | "V2" | "V3" | "V4";
  readonly role: "PRESENTACION" | "PREPARACION" | "GIRO_TENSION" | "REMATE";
  readonly verse: string;
  readonly finalWord: string;
  readonly semanticAnchor: string;
  readonly scansion: OctonolMeterResult;
}

export interface MetricVerseRepairRequest extends MetricVerseRepairContext {
  readonly difference: number;
  readonly targetPositions: number;
  readonly restrictions: readonly string[];
}

export interface MetricVerseRepairVariant {
  readonly slot: MetricVerseRepairContext["slot"];
  readonly role: MetricVerseRepairContext["role"];
  readonly verse: string;
  readonly finalWord: string;
  readonly semanticAnchor: string;
}

export interface MetricVerseRepairRevision extends MetricVerseRepairVariant {
  readonly originalVerse: string;
  readonly attempt: number;
  readonly scansion: OctonolMeterResult;
}

export interface MetricVerseRepairDependencies {
  readonly requestVariants: (request: MetricVerseRepairRequest) => Promise<readonly MetricVerseRepairVariant[]>;
  readonly validate: (verse: string) => OctonolMeterResult;
  readonly maxAttempts: number;
}

export type MetricVerseRepairError =
  | { readonly code: "NO_METRIC_DEFECT"; readonly message: string }
  | { readonly code: "NO_VALID_REPAIR"; readonly message: string; readonly difference: number; readonly attempts: number };

export type MetricVerseRepairResult =
  | { readonly ok: true; readonly value: { readonly revision: MetricVerseRepairRevision; readonly scansion: OctonolMeterResult; readonly attempts: number } }
  | { readonly ok: false; readonly error: MetricVerseRepairError };

export function createMetricVerseRepairPrompt() {
  return METRIC_VERSE_REPAIR_PROMPT;
}

export async function repairMetricVerse(
  context: MetricVerseRepairContext,
  dependencies: MetricVerseRepairDependencies,
): Promise<MetricVerseRepairResult> {
  const difference = context.scansion.difference ?? 0;
  if (context.scansion.verdict !== "INVALIDO" || difference === 0) {
    return { ok: false, error: { code: "NO_METRIC_DEFECT", message: "El verso no tiene un defecto métrico reparable." } };
  }

  const attempts = Math.max(0, Math.floor(dependencies.maxAttempts));
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const request: MetricVerseRepairRequest = Object.freeze({
      ...context,
      difference,
      targetPositions: context.scansion.targetPositions,
      restrictions: Object.freeze(["slot inmutable", "rol inmutable", "ancla semántica inmutable", "palabra final inmutable"]),
    });
    const variants = await dependencies.requestVariants(request);
    for (const variant of variants) {
      if (variant.slot !== context.slot || variant.finalWord !== context.finalWord || variant.semanticAnchor !== context.semanticAnchor) continue;
      const scansion = dependencies.validate(variant.verse);
      if (scansion.verdict !== "VALIDO" || scansion.positionsToLastStress !== context.scansion.targetPositions) continue;
      return { ok: true, value: { attempts: attempt, scansion, revision: Object.freeze({ ...variant, originalVerse: context.verse, attempt, scansion }) } };
    }
  }
  return { ok: false, error: { code: "NO_VALID_REPAIR", message: "No se encontró una reparación métrica válida dentro del presupuesto de intentos.", difference, attempts } };
}

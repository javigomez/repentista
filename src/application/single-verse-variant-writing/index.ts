import type {
  StructuredLlmGenerationError,
  StructuredLlmGenerationPort,
  StructuredLlmGenerationProvenance,
  StructuredLlmLimits,
  StructuredLlmOutputSchema,
  StructuredLlmPrompt,
  StructuredLlmUsage,
  StructuredLlmValidationIssue,
} from "../../ports/structured-llm-generation/index.js";
import type { VerseRole, VerseSlot } from "../../domain/quatrain-candidate/index.js";

// ---------------------------------------------------------------------------
// Consumer-side input contracts
// ---------------------------------------------------------------------------

export type SingleVerseEndingKind = "aguda" | "llana";
export type SingleVerseBudgetReliability = "CONFIABLE" | "DUDOSO";

export interface SingleVerseFinalWordAnalysis {
  readonly word: string;
  readonly stressKind: SingleVerseEndingKind;
  readonly stressedSyllableIndex?: number;
}

export interface SingleVerseMetricBudget {
  readonly targetMetricPositions: number;
  readonly finalWordAnalysis?: SingleVerseFinalWordAnalysis;
  readonly allowedEndingKinds: readonly SingleVerseEndingKind[];
  readonly reliability: SingleVerseBudgetReliability;
}

export interface SingleVerseVariantWritingRequest {
  readonly slot: VerseSlot;
  readonly semanticAnchor: string;
  readonly metricBudget: SingleVerseMetricBudget;
  readonly plannedFinalWord?: string;
  readonly immutableConstraints: readonly string[];
  readonly variantCount: number;
  readonly maxAttempts: number;
}

export interface SingleVerseVariantWriterDependencies {
  readonly generator: StructuredLlmGenerationPort;
  readonly nextVariantId: () => string;
}

// ---------------------------------------------------------------------------
// Draft and batch contracts
// ---------------------------------------------------------------------------

export const SINGLE_VERSE_VARIANT_DRAFT_STATE = "PENDIENTE_VALIDACION_DURA" as const;
export type SingleVerseVariantDraftState = typeof SINGLE_VERSE_VARIANT_DRAFT_STATE;

export interface SingleVerseVariantDraft {
  readonly id: string;
  readonly slot: VerseSlot;
  readonly text: string;
  readonly rationale: string;
  readonly state: SingleVerseVariantDraftState;
  readonly provenance: StructuredLlmGenerationProvenance;
}

export interface SingleVerseVariantBatch {
  readonly slot: VerseSlot;
  readonly drafts: readonly SingleVerseVariantDraft[];
  readonly attempts: number;
  readonly provenance: StructuredLlmGenerationProvenance;
  readonly usage: StructuredLlmUsage;
}

// ---------------------------------------------------------------------------
// Failures
// ---------------------------------------------------------------------------

export type SingleVerseContractBreachCode =
  | "INVALID_STRUCTURED_OUTPUT"
  | "WRONG_SLOT"
  | "MONOLITHIC_QUATRAIN"
  | "CHANGED_FINAL_WORD";

export interface SingleVerseContractBreach {
  readonly code: SingleVerseContractBreachCode;
  readonly message: string;
  readonly issues?: readonly StructuredLlmValidationIssue[];
}

export type SingleVerseVariantWritingFailure =
  | {
      readonly code: "CONTRACT_BREACH";
      readonly message: string;
      readonly breach: SingleVerseContractBreach;
      readonly attempts: number;
      readonly provenance?: StructuredLlmGenerationProvenance;
    }
  | {
      readonly code: "RETRY_EXHAUSTED";
      readonly message: string;
      readonly attempts: number;
      readonly lastError: StructuredLlmGenerationError;
    };

export type SingleVerseVariantWritingResult =
  | { readonly ok: true; readonly value: SingleVerseVariantBatch }
  | { readonly ok: false; readonly error: SingleVerseVariantWritingFailure };

// ---------------------------------------------------------------------------
// LLM output contract
// ---------------------------------------------------------------------------

interface SingleVerseVariantLlmItem {
  readonly text: string;
  readonly rationale: string;
}

interface SingleVerseVariantsLlmOutput {
  readonly slot: VerseSlot;
  readonly variants: readonly SingleVerseVariantLlmItem[];
}

const VERSE_SLOTS: readonly VerseSlot[] = ["V1", "V2", "V3", "V4"];

const singleVerseVariantsSchema: StructuredLlmOutputSchema<SingleVerseVariantsLlmOutput> =
  Object.freeze({
    name: "single-verse-variants",
    version: "0.1.0",
    validate(value: unknown) {
      if (!isRecord(value)) {
        return {
          ok: false as const,
          issues: [{ path: "$", message: "Expected an object." }],
        };
      }

      const issues: StructuredLlmValidationIssue[] = [];

      for (const field of Object.keys(value)) {
        if (field !== "slot" && field !== "variants") {
          issues.push({
            path: `$.${field}`,
            message: "Unexpected field; expected only slot and variants.",
          });
        }
      }

      if (typeof value.slot !== "string" || !VERSE_SLOTS.includes(value.slot as VerseSlot)) {
        issues.push({
          path: "$.slot",
          message: "Expected one of V1, V2, V3, V4.",
        });
      }

      if (!Array.isArray(value.variants) || value.variants.length === 0) {
        issues.push({
          path: "$.variants",
          message: "Expected a non-empty array of single verse variants.",
        });
      } else {
        value.variants.forEach((item, index) => {
          if (!isRecord(item)) {
            issues.push({
              path: `$.variants[${index}]`,
              message: "Expected a variant object.",
            });
            return;
          }

          for (const field of Object.keys(item)) {
            if (field !== "text" && field !== "rationale") {
              issues.push({
                path: `$.variants[${index}].${field}`,
                message: "Unexpected field; expected only text and rationale.",
              });
            }
          }

          if (typeof item.text !== "string" || item.text.trim().length === 0) {
            issues.push({
              path: `$.variants[${index}].text`,
              message: "Expected a non-empty single verse text.",
            });
          }

          if (typeof item.rationale !== "string" || item.rationale.trim().length === 0) {
            issues.push({
              path: `$.variants[${index}].rationale`,
              message: "Expected a non-empty rationale.",
            });
          }
        });
      }

      if (issues.length > 0) {
        return { ok: false as const, issues: Object.freeze(issues) };
      }

      const slot = value.slot as VerseSlot;

      return {
        ok: true as const,
        value: Object.freeze({
          slot,
          variants: Object.freeze(
            (value.variants as readonly SingleVerseVariantLlmItem[]).map((item) =>
              Object.freeze({
                text: item.text.trim(),
                rationale: item.rationale.trim(),
              }),
            ),
          ),
        }),
      };
    },
  });

// ---------------------------------------------------------------------------
// Role-specific prompt templates
// ---------------------------------------------------------------------------

const ROLE_BY_SLOT: Readonly<Record<VerseSlot, VerseRole>> = Object.freeze({
  V1: "PRESENTACION",
  V2: "PREPARACION",
  V3: "GIRO_TENSION",
  V4: "REMATE",
});

const ROLE_DESCRIPTION: Readonly<Record<VerseRole, string>> = Object.freeze({
  PRESENTACION: "presentar la escena y sus protagonistas",
  PREPARACION: "preparar la situacion que conduce al remate",
  GIRO_TENSION: "introducir el giro o la tension antes del cierre",
  REMATE: "cerrar con el remate humoristico",
});

const WRITER_LIMITS: StructuredLlmLimits = Object.freeze({
  timeoutMs: 3_000,
  maxOutputTokens: 1_200,
});

function buildWriterPrompt(request: SingleVerseVariantWritingRequest): StructuredLlmPrompt {
  const role = ROLE_BY_SLOT[request.slot];

  return Object.freeze({
    id: `generation.single-verse-variant.${request.slot.toLowerCase()}`,
    version: "0.1.0",
    messages: Object.freeze([
      Object.freeze({
        role: "system",
        content:
          `Eres el escritor de variantes de un unico verso. Redacta solo el verso ` +
          `${request.slot} con la funcion "${role}" (${ROLE_DESCRIPTION[role]}). ` +
          `No escribas una cuarteta completa ni otros versos.`,
      }),
      Object.freeze({
        role: "user",
        content:
          "Genera variantes independientes de un unico verso respetando las restricciones fijas indicadas.",
      }),
    ]),
  });
}

interface SingleVerseVariantsLlmInput {
  readonly slot: VerseSlot;
  readonly semanticAnchor: string;
  readonly metricBudget: SingleVerseMetricBudget;
  readonly plannedFinalWord?: string;
  readonly immutableConstraints: readonly string[];
  readonly variantCount: number;
}

function buildLlmInput(request: SingleVerseVariantWritingRequest): SingleVerseVariantsLlmInput {
  return Object.freeze({
    slot: request.slot,
    semanticAnchor: request.semanticAnchor,
    metricBudget: Object.freeze({
      targetMetricPositions: request.metricBudget.targetMetricPositions,
      allowedEndingKinds: Object.freeze([...request.metricBudget.allowedEndingKinds]),
      reliability: request.metricBudget.reliability,
      ...(request.metricBudget.finalWordAnalysis === undefined
        ? {}
        : { finalWordAnalysis: request.metricBudget.finalWordAnalysis }),
    }),
    ...(request.plannedFinalWord === undefined ? {} : { plannedFinalWord: request.plannedFinalWord }),
    immutableConstraints: Object.freeze([...request.immutableConstraints]),
    variantCount: request.variantCount,
  });
}

// ---------------------------------------------------------------------------
// Cheap syntactic checks
// ---------------------------------------------------------------------------

const normalizeText = (value: string): string => value.trim().replace(/\s+/gu, " ");

function endsWithPlannedFinalWord(text: string, plannedFinalWord: string): boolean {
  const normalized = normalizeText(text);
  const finalWord = normalizeText(plannedFinalWord);

  if (finalWord.length === 0) {
    return true;
  }

  if (!normalized.endsWith(finalWord)) {
    return false;
  }

  const prefix = normalized.slice(0, -finalWord.length);
  return prefix.length === 0 || /\s$/u.test(prefix);
}

function findCheapBreach(
  output: SingleVerseVariantsLlmOutput,
  request: SingleVerseVariantWritingRequest,
): SingleVerseContractBreach | undefined {
  if (output.slot !== request.slot) {
    return Object.freeze({
      code: "WRONG_SLOT" as const,
      message: `El escritor devolvio variantes para ${output.slot} cuando se solicito ${request.slot}.`,
    });
  }

  for (const [index, item] of output.variants.entries()) {
    if (/\n|\r/u.test(item.text)) {
      return Object.freeze({
        code: "MONOLITHIC_QUATRAIN" as const,
        message: `La variante ${index} contiene mas de un verso en lugar de un unico verso.`,
      });
    }
  }

  if (request.plannedFinalWord !== undefined && request.plannedFinalWord.trim().length > 0) {
    for (const [index, item] of output.variants.entries()) {
      if (!endsWithPlannedFinalWord(item.text, request.plannedFinalWord)) {
        return Object.freeze({
          code: "CHANGED_FINAL_WORD" as const,
          message:
            `La variante ${index} no conserva la palabra final obligatoria ` +
            `"${request.plannedFinalWord}".`,
        });
      }
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Writer
// ---------------------------------------------------------------------------

function createDraft(
  id: string,
  output: SingleVerseVariantsLlmOutput,
  item: SingleVerseVariantLlmItem,
  provenance: StructuredLlmGenerationProvenance,
): SingleVerseVariantDraft {
  return Object.freeze({
    id,
    slot: output.slot,
    text: item.text,
    rationale: item.rationale,
    state: SINGLE_VERSE_VARIANT_DRAFT_STATE,
    provenance,
  });
}

export async function writeSingleVerseVariants(
  request: SingleVerseVariantWritingRequest,
  dependencies: SingleVerseVariantWriterDependencies,
): Promise<SingleVerseVariantWritingResult> {
  let lastBreach: SingleVerseContractBreach | undefined;
  let lastBreachProvenance: StructuredLlmGenerationProvenance | undefined;
  let lastError: StructuredLlmGenerationError | undefined;

  for (let attempt = 1; attempt <= request.maxAttempts; attempt += 1) {
    const generation = await dependencies.generator.generate<SingleVerseVariantsLlmOutput>({
      operation: `write-single-verse-variant.${request.slot.toLowerCase()}`,
      prompt: buildWriterPrompt(request),
      input: buildLlmInput(request),
      outputSchema: singleVerseVariantsSchema,
      limits: WRITER_LIMITS,
    });

    if (!generation.ok) {
      if (generation.error.code === "INVALID_STRUCTURED_OUTPUT") {
        lastBreach = Object.freeze({
          code: "INVALID_STRUCTURED_OUTPUT" as const,
          message: generation.error.message,
          issues: generation.error.validationIssues,
        });
        lastBreachProvenance = generation.error.provenance;
        continue;
      }

      if (generation.error.retryable) {
        lastError = generation.error;
        continue;
      }

      return Object.freeze({
        ok: false as const,
        error: Object.freeze({
          code: "RETRY_EXHAUSTED" as const,
          message: `El escritor no pudo obtener una respuesta confiable tras ${attempt} intento(s).`,
          attempts: attempt,
          lastError: generation.error,
        }),
      });
    }

    const breach = findCheapBreach(generation.value.data, request);

    if (breach !== undefined) {
      lastBreach = breach;
      lastBreachProvenance = generation.value.provenance;
      continue;
    }

    const drafts: SingleVerseVariantDraft[] = [];
    const selectedItems = generation.value.data.variants.slice(0, request.variantCount);

    for (const item of selectedItems) {
      drafts.push(
        createDraft(
          dependencies.nextVariantId(),
          generation.value.data,
          item,
          generation.value.provenance,
        ),
      );
    }

    return Object.freeze({
      ok: true as const,
      value: Object.freeze({
        slot: request.slot,
        drafts: Object.freeze(drafts),
        attempts: attempt,
        provenance: generation.value.provenance,
        usage: generation.value.usage,
      }),
    });
  }

  if (lastBreach !== undefined) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "CONTRACT_BREACH" as const,
        message: `El escritor no respeto el contrato de un unico verso tras ${request.maxAttempts} intento(s).`,
        breach: lastBreach,
        attempts: request.maxAttempts,
        ...(lastBreachProvenance === undefined ? {} : { provenance: lastBreachProvenance }),
      }),
    });
  }

  const fallbackError: StructuredLlmGenerationError = {
    code: "PROVIDER_UNAVAILABLE",
    message: "El escritor no obtuvo ninguna respuesta del modelo.",
    retryable: true,
  };

  return Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "RETRY_EXHAUSTED" as const,
      message: `El escritor agoto los ${request.maxAttempts} intentos sin exito.`,
      attempts: request.maxAttempts,
      lastError: lastError ?? fallbackError,
    }),
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

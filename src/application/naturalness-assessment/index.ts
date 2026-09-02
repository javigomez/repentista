import type {
  StructuredLlmGenerationError,
  StructuredLlmGenerationPort,
  StructuredLlmLimits,
  StructuredLlmOutputSchema,
  StructuredLlmPrompt,
  StructuredLlmSchemaValidationResult,
  StructuredLlmValidationIssue,
} from "../../ports/structured-llm-generation/index.js";
import {
  hasPassedHardValidation,
  type NaturalnessAssessmentRecord,
  type QuatrainCandidate,
  type QuatrainCandidateState,
  type VerseSlot,
} from "../../domain/quatrain-candidate/index.js";

export const NATURALNESS_RUBRIC_VERSION = "0.1.0" as const;
export const NATURALNESS_NOTE_MINIMUM = 0;
export const NATURALNESS_NOTE_MAXIMUM = 20;
export const NATURALNESS_CONFIDENCE_MINIMUM = 0;
export const NATURALNESS_CONFIDENCE_MAXIMUM = 1;

const VERSE_SLOTS: readonly VerseSlot[] = Object.freeze(["V1", "V2", "V3", "V4"]);
const VERSE_SLOT_SET: ReadonlySet<VerseSlot> = new Set(VERSE_SLOTS);

export const NATURALNESS_RUBRIC_PROMPT: StructuredLlmPrompt = Object.freeze({
  id: "naturalness-rubric",
  version: NATURALNESS_RUBRIC_VERSION,
  messages: Object.freeze([
    Object.freeze({
      role: "system",
      content:
        "Eres un crítico editorial de naturalidad en castellano. Evalúa si cada verso suena como una frase que una persona diría de verdad, sin forzar la gramática ni la pronunciación para cumplir la rima. La naturalidad no es rareza ni humor: un giro absurdo puede ser natural si la frase es fluida, y un verso formal puede ser antinatural si nadie lo diría así. No recompenses defensas teóricas.",
    }),
    Object.freeze({
      role: "user",
      content:
        "Califica la naturalidad global de 0 a 20 (entero) y devuelve una confianza de 0 a 1. Para cada fragmento problemático, cita el texto exacto del verso y da una razón observable.\n\nEjemplos ancla aprobados (naturales):\n- \"El gato promete compartir la merienda.\"\n- \"Se distrajo y se comió el pan que guardaba.\"\n\nEjemplos ancla rechazados (antinaturales por ripio o forzamiento):\n- \"El dragón estaba sentado porque era bastante cuadrado.\"\n- \"Subió la cuesta sin protesta aunque la rima le cuesta.\"\n\nDevuelve exclusivamente el objeto JSON con los campos note, confidence y observations (cada observación con slot, fragment y reason).",
    }),
  ]),
});

export interface NaturalnessVerse {
  readonly slot: VerseSlot;
  readonly text: string;
}

export interface NaturalnessAssessmentRequest {
  readonly candidate: QuatrainCandidate;
  readonly verses: readonly NaturalnessVerse[];
  readonly generator: StructuredLlmGenerationPort;
  readonly limits: StructuredLlmLimits;
}

export type NaturalnessAssessmentFailure =
  | {
      readonly code: "CANDIDATE_NOT_ELIGIBLE";
      readonly message: string;
      readonly currentState: QuatrainCandidateState;
    }
  | {
      readonly code: "INCOMPLETE_VERSES";
      readonly message: string;
      readonly missingSlots: readonly VerseSlot[];
    }
  | {
      readonly code: "CITATION_NOT_IN_VERSE";
      readonly message: string;
      readonly slot: VerseSlot;
      readonly fragment: string;
    }
  | {
      readonly code: "LLM_ASSESSMENT_FAILED";
      readonly message: string;
      readonly cause: StructuredLlmGenerationError;
    };

export type NaturalnessAssessmentResult =
  | { readonly ok: true; readonly value: NaturalnessAssessmentRecord }
  | { readonly ok: false; readonly error: NaturalnessAssessmentFailure };

interface NaturalnessLlmObservation {
  readonly slot: VerseSlot;
  readonly fragment: string;
  readonly reason: string;
}

interface NaturalnessLlmOutput {
  readonly note: number;
  readonly confidence: number;
  readonly observations: readonly NaturalnessLlmObservation[];
}

const naturalnessOutputSchema: StructuredLlmOutputSchema<NaturalnessLlmOutput> = Object.freeze({
  name: "naturalness-assessment",
  version: "0.1.0",
  validate(value: unknown): StructuredLlmSchemaValidationResult<NaturalnessLlmOutput> {
    if (!isRecord(value)) {
      return {
        ok: false as const,
        issues: Object.freeze([{ path: "$", message: "Expected an object." }]),
      };
    }

    const issues: StructuredLlmValidationIssue[] = [];

    for (const field of Object.keys(value)) {
      if (field !== "note" && field !== "confidence" && field !== "observations") {
        issues.push({ path: `$.${field}`, message: "Unexpected field." });
      }
    }

    const rawNote = value.note;
    const noteIsValid =
      typeof rawNote === "number" &&
      Number.isInteger(rawNote) &&
      rawNote >= NATURALNESS_NOTE_MINIMUM &&
      rawNote <= NATURALNESS_NOTE_MAXIMUM;

    if (!noteIsValid) {
      issues.push({
        path: "$.note",
        message: `Expected an integer between ${NATURALNESS_NOTE_MINIMUM} and ${NATURALNESS_NOTE_MAXIMUM}.`,
      });
    }

    const rawConfidence = value.confidence;
    const confidenceIsValid =
      typeof rawConfidence === "number" &&
      Number.isFinite(rawConfidence) &&
      rawConfidence >= NATURALNESS_CONFIDENCE_MINIMUM &&
      rawConfidence <= NATURALNESS_CONFIDENCE_MAXIMUM;

    if (!confidenceIsValid) {
      issues.push({
        path: "$.confidence",
        message: `Expected a number between ${NATURALNESS_CONFIDENCE_MINIMUM} and ${NATURALNESS_CONFIDENCE_MAXIMUM}.`,
      });
    }

    const observations: NaturalnessLlmObservation[] = [];
    const seenSlots = new Set<VerseSlot>();

    if (!Array.isArray(value.observations)) {
      issues.push({ path: "$.observations", message: "Expected an array." });
    } else {
      value.observations.forEach((item, index) => {
        const basePath = `$.observations[${index}]`;

        if (!isRecord(item)) {
          issues.push({ path: basePath, message: "Expected an object." });
          return;
        }

        const slot = typeof item.slot === "string" ? (item.slot as VerseSlot) : undefined;
        const slotIsValid = slot !== undefined && VERSE_SLOT_SET.has(slot);
        const slotIsDuplicate = slotIsValid && seenSlots.has(slot as VerseSlot);

        if (!slotIsValid) {
          issues.push({ path: `${basePath}.slot`, message: "Expected a valid verse slot." });
        } else if (slotIsDuplicate) {
          issues.push({ path: `${basePath}.slot`, message: "Slot must not be repeated." });
        } else {
          seenSlots.add(slot as VerseSlot);
        }

        const fragment = typeof item.fragment === "string" ? item.fragment.trim() : "";

        if (fragment.length === 0) {
          issues.push({
            path: `${basePath}.fragment`,
            message: "Expected a non-empty citation.",
          });
        }

        const reason = typeof item.reason === "string" ? item.reason.trim() : "";

        if (reason.length === 0) {
          issues.push({ path: `${basePath}.reason`, message: "Expected a non-empty reason." });
        }

        if (slotIsValid && !slotIsDuplicate && fragment.length > 0 && reason.length > 0) {
          observations.push(Object.freeze({ slot: slot as VerseSlot, fragment, reason }));
        }
      });
    }

    if (issues.length > 0) {
      return { ok: false as const, issues: Object.freeze(issues) };
    }

    return {
      ok: true as const,
      value: Object.freeze({
        note: rawNote as number,
        confidence: rawConfidence as number,
        observations: Object.freeze(observations),
      }),
    };
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectVerseText(verses: readonly NaturalnessVerse[]): {
  readonly ok: true;
  readonly bySlot: ReadonlyMap<VerseSlot, string>;
} | {
  readonly ok: false;
  readonly missingSlots: readonly VerseSlot[];
} {
  const bySlot = new Map<VerseSlot, string>();

  for (const verse of verses) {
    if (!VERSE_SLOT_SET.has(verse.slot) || bySlot.has(verse.slot)) {
      continue;
    }

    if (verse.text.trim().length > 0) {
      bySlot.set(verse.slot, verse.text.trim());
    }
  }

  const missingSlots = VERSE_SLOTS.filter((slot) => !bySlot.has(slot));

  if (missingSlots.length > 0) {
    return { ok: false as const, missingSlots: Object.freeze([...missingSlots]) };
  }

  return { ok: true as const, bySlot };
}

function findMissingCitation(
  output: NaturalnessLlmOutput,
  bySlot: ReadonlyMap<VerseSlot, string>,
): { readonly slot: VerseSlot; readonly fragment: string } | undefined {
  for (const observation of output.observations) {
    const verseText = bySlot.get(observation.slot);

    if (verseText === undefined || !verseText.includes(observation.fragment)) {
      return { slot: observation.slot, fragment: observation.fragment };
    }
  }

  return undefined;
}

export async function assessNaturalness(
  request: NaturalnessAssessmentRequest,
): Promise<NaturalnessAssessmentResult> {
  if (!hasPassedHardValidation(request.candidate.state)) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "CANDIDATE_NOT_ELIGIBLE" as const,
        message: `La naturalidad solo se evalúa sobre candidatos que superaron los bloqueos duros (estado actual: ${request.candidate.state}).`,
        currentState: request.candidate.state,
      }),
    });
  }

  const collected = collectVerseText(request.verses);

  if (!collected.ok) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "INCOMPLETE_VERSES" as const,
        message: "La evaluación de naturalidad requiere los cuatro versos del candidato.",
        missingSlots: collected.missingSlots,
      }),
    });
  }

  const generation = await request.generator.generate({
    operation: "assess-naturalness",
    prompt: NATURALNESS_RUBRIC_PROMPT,
    input: Object.freeze({
      verses: Object.freeze(
        VERSE_SLOTS.map((slot) =>
          Object.freeze({ slot, text: collected.bySlot.get(slot) }),
        ),
      ),
    }),
    outputSchema: naturalnessOutputSchema,
    limits: request.limits,
  });

  if (!generation.ok) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "LLM_ASSESSMENT_FAILED" as const,
        message: "El LLM no pudo producir una evaluación de naturalidad conforme al esquema.",
        cause: generation.error,
      }),
    });
  }

  const missingCitation = findMissingCitation(generation.value.data, collected.bySlot);

  if (missingCitation !== undefined) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "CITATION_NOT_IN_VERSE" as const,
        message: "La evaluación cita un fragmento que no aparece en el verso evaluado.",
        slot: missingCitation.slot,
        fragment: missingCitation.fragment,
      }),
    });
  }

  const provenance = generation.value.provenance;

  return Object.freeze({
    ok: true as const,
    value: Object.freeze({
      note: generation.value.data.note,
      confidence: generation.value.data.confidence,
      observations: Object.freeze(
        generation.value.data.observations.map((observation) =>
          Object.freeze({
            slot: observation.slot,
            fragment: observation.fragment,
            reason: observation.reason,
          }),
        ),
      ),
      rubricVersion: NATURALNESS_RUBRIC_VERSION,
      prompt: Object.freeze({
        id: provenance.prompt.id,
        version: provenance.prompt.version,
      }),
      model: Object.freeze({
        provider: provenance.provider,
        name: provenance.model,
      }),
      assessedAt: provenance.completedAt,
      providerRequestId: provenance.requestId,
    }),
  });
}

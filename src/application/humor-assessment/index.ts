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
  HUMOR_CLARITIES,
  HUMOR_MECHANISMS,
  type HumorAssessmentRecord,
  type HumorClarity,
  type HumorMechanism,
  type QuatrainCandidate,
  type QuatrainCandidateState,
  type VerseSlot,
} from "../../domain/quatrain-candidate/index.js";

export const HUMOR_RUBRIC_VERSION = "0.1.0" as const;
export const HUMOR_NOTE_MINIMUM = 0;
export const HUMOR_NOTE_MAXIMUM = 10;
export const HUMOR_CONFIDENCE_MINIMUM = 0;
export const HUMOR_CONFIDENCE_MAXIMUM = 1;

const VERSE_SLOTS: readonly VerseSlot[] = Object.freeze(["V1", "V2", "V3", "V4"]);
const VERSE_SLOT_SET: ReadonlySet<VerseSlot> = new Set(VERSE_SLOTS);

const HUMOR_MECHANISM_SET: ReadonlySet<HumorMechanism> = new Set(HUMOR_MECHANISMS);
const HUMOR_CLARITY_SET: ReadonlySet<HumorClarity> = new Set(HUMOR_CLARITIES);

export const HUMOR_RUBRIC_PROMPT: StructuredLlmPrompt = Object.freeze({
  id: "humor-rubric",
  version: HUMOR_RUBRIC_VERSION,
  messages: Object.freeze([
    Object.freeze({
      role: "system",
      content:
        "Eres un crítico editorial de humor en castellano para lectores de 10 a 12 años. Evalúa si la cuarteta produce un efecto humorístico accesible, seguro y comprensible, sin confundir rareza con humor y sin premiar contenido ofensivo. El humor debe tener un mecanismo observable en el texto: sorpresa, absurdo, imagen o juego conceptual. No evalúes métrica, rima, diccionario, naturalidad, coherencia ni remate: solo el efecto humorístico. Una rareza sin causa textual clara no es humor; si no puedes localizar la causa, no la inventes.",
    }),
    Object.freeze({
      role: "user",
      content:
        "Califica el humor global de 0 a 10 (entero) y devuelve una confianza de 0 a 1. Identifica un único mecanismo dominante (SORPRESA, ABSURDO, IMAGEN o JUEGO_CONCEPTUAL), la claridad del efecto (CLARA o AMBIGUA) y los fragmentos que producen el efecto (cada uno con slot, fragmento exacto y razón observable).\n\nEjemplos ancla aprobados (humor claro):\n- SORPRESA: una promesa inocente se resuelve con un giro inesperado que no ofende.\n- IMAGEN: una imagen concreta y cómica sin necesidad de insultar.\n- ABSURDO: una situación imposible tratada con naturalidad.\n- JUEGO_CONCEPTUAL: un doble sentido accesible al público objetivo.\n\nEjemplos ancla rechazados (rareza confusa, no humor):\n- Una rareza gratuita sin causa clara que no produce sorpresa ni imagen.\n- Un chiste que exige insultar o ridiculizar a alguien.\n\nDevuelve exclusivamente el objeto JSON con los campos note, confidence, mechanism, clarity y fragments (lista no vacía de objetos con slot, fragment y reason).",
    }),
  ]),
});

export interface HumorVerse {
  readonly slot: VerseSlot;
  readonly text: string;
}

export interface HumorAssessmentRequest {
  readonly candidate: QuatrainCandidate;
  readonly verses: readonly HumorVerse[];
  readonly generator: StructuredLlmGenerationPort;
  readonly limits: StructuredLlmLimits;
}

export type HumorAssessmentFailure =
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

export type HumorAssessmentResult =
  | { readonly ok: true; readonly value: HumorAssessmentRecord }
  | { readonly ok: false; readonly error: HumorAssessmentFailure };

interface HumorLlmFragment {
  readonly slot: VerseSlot;
  readonly fragment: string;
  readonly reason: string;
}

interface HumorLlmOutput {
  readonly note: number;
  readonly confidence: number;
  readonly mechanism: HumorMechanism;
  readonly clarity: HumorClarity;
  readonly fragments: readonly HumorLlmFragment[];
}

const humorOutputSchema: StructuredLlmOutputSchema<HumorLlmOutput> = Object.freeze({
  name: "humor-assessment",
  version: "0.1.0",
  validate(value: unknown): StructuredLlmSchemaValidationResult<HumorLlmOutput> {
    if (!isRecord(value)) {
      return {
        ok: false as const,
        issues: Object.freeze([{ path: "$", message: "Expected an object." }]),
      };
    }

    const issues: StructuredLlmValidationIssue[] = [];

    for (const field of Object.keys(value)) {
      if (
        field !== "note" &&
        field !== "confidence" &&
        field !== "mechanism" &&
        field !== "clarity" &&
        field !== "fragments"
      ) {
        issues.push({ path: `$.${field}`, message: "Unexpected field." });
      }
    }

    const rawNote = value.note;
    const noteIsValid =
      typeof rawNote === "number" &&
      Number.isInteger(rawNote) &&
      rawNote >= HUMOR_NOTE_MINIMUM &&
      rawNote <= HUMOR_NOTE_MAXIMUM;

    if (!noteIsValid) {
      issues.push({
        path: "$.note",
        message: `Expected an integer between ${HUMOR_NOTE_MINIMUM} and ${HUMOR_NOTE_MAXIMUM}.`,
      });
    }

    const rawConfidence = value.confidence;
    const confidenceIsValid =
      typeof rawConfidence === "number" &&
      Number.isFinite(rawConfidence) &&
      rawConfidence >= HUMOR_CONFIDENCE_MINIMUM &&
      rawConfidence <= HUMOR_CONFIDENCE_MAXIMUM;

    if (!confidenceIsValid) {
      issues.push({
        path: "$.confidence",
        message: `Expected a number between ${HUMOR_CONFIDENCE_MINIMUM} and ${HUMOR_CONFIDENCE_MAXIMUM}.`,
      });
    }

    const mechanism =
      typeof value.mechanism === "string" ? (value.mechanism as HumorMechanism) : undefined;

    if (mechanism === undefined || !HUMOR_MECHANISM_SET.has(mechanism)) {
      issues.push({
        path: "$.mechanism",
        message: `Expected one of ${HUMOR_MECHANISMS.join(", ")}.`,
      });
    }

    const clarity =
      typeof value.clarity === "string" ? (value.clarity as HumorClarity) : undefined;

    if (clarity === undefined || !HUMOR_CLARITY_SET.has(clarity)) {
      issues.push({
        path: "$.clarity",
        message: `Expected one of ${HUMOR_CLARITIES.join(", ")}.`,
      });
    }

    const fragments: HumorLlmFragment[] = [];

    if (!Array.isArray(value.fragments)) {
      issues.push({ path: "$.fragments", message: "Expected an array." });
    } else if (value.fragments.length === 0) {
      issues.push({
        path: "$.fragments",
        message: "Expected at least one localized fragment that produces the humor.",
      });
    } else {
      value.fragments.forEach((item, index) => {
        const basePath = `$.fragments[${index}]`;

        if (!isRecord(item)) {
          issues.push({ path: basePath, message: "Expected an object." });
          return;
        }

        const slot = typeof item.slot === "string" ? (item.slot as VerseSlot) : undefined;
        const slotIsValid = slot !== undefined && VERSE_SLOT_SET.has(slot);

        if (!slotIsValid) {
          issues.push({ path: `${basePath}.slot`, message: "Expected a valid verse slot." });
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

        if (slotIsValid && fragment.length > 0 && reason.length > 0) {
          fragments.push(Object.freeze({ slot: slot as VerseSlot, fragment, reason }));
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
        mechanism: mechanism as HumorMechanism,
        clarity: clarity as HumorClarity,
        fragments: Object.freeze(fragments),
      }),
    };
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectVerseText(verses: readonly HumorVerse[]): {
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
  output: HumorLlmOutput,
  bySlot: ReadonlyMap<VerseSlot, string>,
): { readonly slot: VerseSlot; readonly fragment: string } | undefined {
  for (const fragment of output.fragments) {
    const verseText = bySlot.get(fragment.slot);

    if (verseText === undefined || !verseText.includes(fragment.fragment)) {
      return { slot: fragment.slot, fragment: fragment.fragment };
    }
  }

  return undefined;
}

export async function assessHumor(
  request: HumorAssessmentRequest,
): Promise<HumorAssessmentResult> {
  if (!hasPassedHardValidation(request.candidate.state)) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "CANDIDATE_NOT_ELIGIBLE" as const,
        message: `El humor solo se evalúa sobre candidatos que superaron los bloqueos duros (estado actual: ${request.candidate.state}).`,
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
        message: "La evaluación de humor requiere los cuatro versos del candidato.",
        missingSlots: collected.missingSlots,
      }),
    });
  }

  const generation = await request.generator.generate({
    operation: "assess-humor",
    prompt: HUMOR_RUBRIC_PROMPT,
    input: Object.freeze({
      verses: Object.freeze(
        VERSE_SLOTS.map((slot) =>
          Object.freeze({ slot, text: collected.bySlot.get(slot) }),
        ),
      ),
    }),
    outputSchema: humorOutputSchema,
    limits: request.limits,
  });

  if (!generation.ok) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "LLM_ASSESSMENT_FAILED" as const,
        message: "El LLM no pudo producir una evaluación de humor conforme al esquema.",
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
        message: "La evaluación de humor cita un fragmento que no aparece en el verso evaluado.",
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
      mechanism: generation.value.data.mechanism,
      clarity: generation.value.data.clarity,
      fragments: Object.freeze(
        generation.value.data.fragments.map((fragment) =>
          Object.freeze({
            slot: fragment.slot,
            fragment: fragment.fragment,
            reason: fragment.reason,
          }),
        ),
      ),
      rubricVersion: HUMOR_RUBRIC_VERSION,
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

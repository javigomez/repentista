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
  PUNCHLINE_CONTEXT_DEPENDENCIES,
  PUNCHLINE_TWIST_DEGREES,
  type PunchlineAssessmentRecord,
  type PunchlineContextDependency,
  type PunchlineTwistDegree,
  type QuatrainCandidate,
  type QuatrainCandidateState,
  type VerseSlot,
} from "../../domain/quatrain-candidate/index.js";

export const PUNCHLINE_RUBRIC_VERSION = "0.1.0" as const;
export const PUNCHLINE_NOTE_MINIMUM = 0;
export const PUNCHLINE_NOTE_MAXIMUM = 10;
export const PUNCHLINE_CONFIDENCE_MINIMUM = 0;
export const PUNCHLINE_CONFIDENCE_MAXIMUM = 1;

const VERSE_SLOTS: readonly VerseSlot[] = Object.freeze(["V1", "V2", "V3", "V4"]);
const VERSE_SLOT_SET: ReadonlySet<VerseSlot> = new Set(VERSE_SLOTS);

const EXPECTATION_SLOTS: readonly VerseSlot[] = Object.freeze(["V1", "V2", "V3"]);

const TWIST_DEGREE_SET: ReadonlySet<PunchlineTwistDegree> = new Set(PUNCHLINE_TWIST_DEGREES);
const CONTEXT_DEPENDENCY_SET: ReadonlySet<PunchlineContextDependency> = new Set(
  PUNCHLINE_CONTEXT_DEPENDENCIES,
);

export const PUNCHLINE_RUBRIC_PROMPT: StructuredLlmPrompt = Object.freeze({
  id: "punchline-rubric",
  version: PUNCHLINE_RUBRIC_VERSION,
  messages: Object.freeze([
    Object.freeze({
      role: "system",
      content:
        "Eres un crítico editorial de la eficacia del remate en castellano. Evalúa si el verso V4 funciona como resolución o giro de la expectativa construida por V1–V3, independientemente de cuánto humor produzca. Un remate claro puede no ser gracioso y aun así ser excelente; un cierre gracioso sin preparación es un mal remate. No evalúes métrica, rima, diccionario, naturalidad, coherencia ni humor: solo la función final de V4. Un cierre meramente descriptivo que continúa la escena sin resolver ni cambiar la expectativa no es un remate, aunque sea formalmente correcto.",
    }),
    Object.freeze({
      role: "user",
      content:
        "Recibes el plan (roles y anclas semánticas) y el texto de los cuatro versos. Identifica la expectativa que V1–V3 construyen, resume cómo V4 la resuelve o transforma, valora el grado de giro y la dependencia de V4 respecto al contexto previo.\n\nExige para ello: cita textual de V1–V3 que justifique la expectativa (expectationEvidence) y una cita textual de V4 que justifique la resolución (resolutionEvidence). Si no puedes localizar una cita real en el texto, no la inventes: usa una cita exacta que sí exista y reduce la confianza.\n\nEjemplos ancla de remate preparado y resuelto (alta nota):\n- V1–V3 construyen una promesa de compartir y V4 la convierte en un giro de palabras.\n\nEjemplos ancla de cierre meramente descriptivo (baja nota):\n- V4 continúa describiendo la escena sin resolver ni cambiar la tensión previa.\n\nEjemplos ancla de remate sólido no humorístico (alta nota):\n- V4 resuelve con claridad aunque no tenga efecto cómico.\n\nDevuelve exclusivamente el objeto JSON con los campos note (entero de 0 a 10), confidence (0 a 1), expectation, expectationEvidence (lista de citas de V1–V3), resolution, resolutionEvidence (cita de V4), twistDegree (NINGUNO, LEVE, MODERADO o FUERTE) y contextDependency (NULA, PARCIAL o TOTAL).",
    }),
  ]),
});

export interface PunchlineVerse {
  readonly slot: VerseSlot;
  readonly text: string;
}

export interface PunchlineAssessmentRequest {
  readonly candidate: QuatrainCandidate;
  readonly verses: readonly PunchlineVerse[];
  readonly generator: StructuredLlmGenerationPort;
  readonly limits: StructuredLlmLimits;
}

export type PunchlineCitationScope = "V1_V3" | "V4";

export type PunchlineAssessmentFailure =
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
      readonly fragment: string;
      readonly expectedScope: PunchlineCitationScope;
    }
  | {
      readonly code: "LLM_ASSESSMENT_FAILED";
      readonly message: string;
      readonly cause: StructuredLlmGenerationError;
    };

export type PunchlineAssessmentResult =
  | { readonly ok: true; readonly value: PunchlineAssessmentRecord }
  | { readonly ok: false; readonly error: PunchlineAssessmentFailure };

interface PunchlineLlmOutput {
  readonly note: number;
  readonly confidence: number;
  readonly expectation: string;
  readonly expectationEvidence: readonly string[];
  readonly resolution: string;
  readonly resolutionEvidence: string;
  readonly twistDegree: PunchlineTwistDegree;
  readonly contextDependency: PunchlineContextDependency;
}

const punchlineOutputSchema: StructuredLlmOutputSchema<PunchlineLlmOutput> = Object.freeze({
  name: "punchline-assessment",
  version: "0.1.0",
  validate(value: unknown): StructuredLlmSchemaValidationResult<PunchlineLlmOutput> {
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
        field !== "expectation" &&
        field !== "expectationEvidence" &&
        field !== "resolution" &&
        field !== "resolutionEvidence" &&
        field !== "twistDegree" &&
        field !== "contextDependency"
      ) {
        issues.push({ path: `$.${field}`, message: "Unexpected field." });
      }
    }

    const rawNote = value.note;
    const noteIsValid =
      typeof rawNote === "number" &&
      Number.isInteger(rawNote) &&
      rawNote >= PUNCHLINE_NOTE_MINIMUM &&
      rawNote <= PUNCHLINE_NOTE_MAXIMUM;

    if (!noteIsValid) {
      issues.push({
        path: "$.note",
        message: `Expected an integer between ${PUNCHLINE_NOTE_MINIMUM} and ${PUNCHLINE_NOTE_MAXIMUM}.`,
      });
    }

    const rawConfidence = value.confidence;
    const confidenceIsValid =
      typeof rawConfidence === "number" &&
      Number.isFinite(rawConfidence) &&
      rawConfidence >= PUNCHLINE_CONFIDENCE_MINIMUM &&
      rawConfidence <= PUNCHLINE_CONFIDENCE_MAXIMUM;

    if (!confidenceIsValid) {
      issues.push({
        path: "$.confidence",
        message: `Expected a number between ${PUNCHLINE_CONFIDENCE_MINIMUM} and ${PUNCHLINE_CONFIDENCE_MAXIMUM}.`,
      });
    }

    const expectation = typeof value.expectation === "string" ? value.expectation.trim() : "";

    if (expectation.length === 0) {
      issues.push({
        path: "$.expectation",
        message: "Expected a non-empty summary of the prior expectation.",
      });
    }

    const resolution = typeof value.resolution === "string" ? value.resolution.trim() : "";

    if (resolution.length === 0) {
      issues.push({
        path: "$.resolution",
        message: "Expected a non-empty summary of the V4 resolution.",
      });
    }

    const expectationEvidence: string[] = [];
    const seenExpectationEvidence = new Set<string>();

    if (!Array.isArray(value.expectationEvidence)) {
      issues.push({ path: "$.expectationEvidence", message: "Expected an array." });
    } else if (value.expectationEvidence.length === 0) {
      issues.push({
        path: "$.expectationEvidence",
        message: "Expected at least one textual citation from V1–V3.",
      });
    } else {
      value.expectationEvidence.forEach((item, index) => {
        const basePath = `$.expectationEvidence[${index}]`;
        const citation = typeof item === "string" ? item.trim() : "";

        if (citation.length === 0) {
          issues.push({ path: basePath, message: "Expected a non-empty citation." });
          return;
        }

        if (seenExpectationEvidence.has(citation)) {
          issues.push({ path: basePath, message: "Citation must not be repeated." });
          return;
        }

        seenExpectationEvidence.add(citation);
        expectationEvidence.push(citation);
      });
    }

    const resolutionEvidence =
      typeof value.resolutionEvidence === "string" ? value.resolutionEvidence.trim() : "";

    if (resolutionEvidence.length === 0) {
      issues.push({
        path: "$.resolutionEvidence",
        message: "Expected a non-empty textual citation from V4.",
      });
    }

    const twistDegree =
      typeof value.twistDegree === "string" ? (value.twistDegree as PunchlineTwistDegree) : undefined;

    if (twistDegree === undefined || !TWIST_DEGREE_SET.has(twistDegree)) {
      issues.push({
        path: "$.twistDegree",
        message: "Expected one of NINGUNO, LEVE, MODERADO, FUERTE.",
      });
    }

    const contextDependency =
      typeof value.contextDependency === "string"
        ? (value.contextDependency as PunchlineContextDependency)
        : undefined;

    if (
      contextDependency === undefined ||
      !CONTEXT_DEPENDENCY_SET.has(contextDependency)
    ) {
      issues.push({
        path: "$.contextDependency",
        message: "Expected one of NULA, PARCIAL, TOTAL.",
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
        expectation,
        expectationEvidence: Object.freeze(expectationEvidence),
        resolution,
        resolutionEvidence,
        twistDegree: twistDegree as PunchlineTwistDegree,
        contextDependency: contextDependency as PunchlineContextDependency,
      }),
    };
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectVerseText(verses: readonly PunchlineVerse[]): {
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

function findCitationNotInVerse(
  data: Pick<PunchlineLlmOutput, "expectationEvidence" | "resolutionEvidence">,
  bySlot: ReadonlyMap<VerseSlot, string>,
): { readonly fragment: string; readonly expectedScope: PunchlineCitationScope } | undefined {
  for (const citation of data.expectationEvidence) {
    const found = EXPECTATION_SLOTS.some((slot) => {
      const text = bySlot.get(slot);

      return text !== undefined && text.includes(citation);
    });

    if (!found) {
      return { fragment: citation, expectedScope: "V1_V3" };
    }
  }

  const v4Text = bySlot.get("V4");

  if (v4Text === undefined || !v4Text.includes(data.resolutionEvidence)) {
    return { fragment: data.resolutionEvidence, expectedScope: "V4" };
  }

  return undefined;
}

export async function assessPunchline(
  request: PunchlineAssessmentRequest,
): Promise<PunchlineAssessmentResult> {
  if (!hasPassedHardValidation(request.candidate.state)) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "CANDIDATE_NOT_ELIGIBLE" as const,
        message: `El remate solo se evalúa sobre candidatos que superaron los bloqueos duros (estado actual: ${request.candidate.state}).`,
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
        message: "La evaluación del remate requiere los cuatro versos del candidato.",
        missingSlots: collected.missingSlots,
      }),
    });
  }

  const generation = await request.generator.generate({
    operation: "assess-punchline",
    prompt: PUNCHLINE_RUBRIC_PROMPT,
    input: Object.freeze({
      verses: Object.freeze(
        VERSE_SLOTS.map((slot) =>
          Object.freeze({ slot, text: collected.bySlot.get(slot) }),
        ),
      ),
      plan: Object.freeze(
        request.candidate.plan.slots.map((slot) =>
          Object.freeze({
            slot: slot.slot,
            role: slot.role,
            semanticAnchor: slot.semanticAnchor,
          }),
        ),
      ),
    }),
    outputSchema: punchlineOutputSchema,
    limits: request.limits,
  });

  if (!generation.ok) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "LLM_ASSESSMENT_FAILED" as const,
        message: "El LLM no pudo producir una evaluación de remate conforme al esquema.",
        cause: generation.error,
      }),
    });
  }

  const missingCitation = findCitationNotInVerse(generation.value.data, collected.bySlot);

  if (missingCitation !== undefined) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "CITATION_NOT_IN_VERSE" as const,
        message: `La evaluación de remate cita un fragmento que no aparece en el verso evaluado (${missingCitation.expectedScope}).`,
        fragment: missingCitation.fragment,
        expectedScope: missingCitation.expectedScope,
      }),
    });
  }

  const provenance = generation.value.provenance;

  return Object.freeze({
    ok: true as const,
    value: Object.freeze({
      note: generation.value.data.note,
      confidence: generation.value.data.confidence,
      expectation: generation.value.data.expectation,
      expectationEvidence: Object.freeze([...generation.value.data.expectationEvidence]),
      resolution: generation.value.data.resolution,
      resolutionEvidence: generation.value.data.resolutionEvidence,
      twistDegree: generation.value.data.twistDegree,
      contextDependency: generation.value.data.contextDependency,
      rubricVersion: PUNCHLINE_RUBRIC_VERSION,
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

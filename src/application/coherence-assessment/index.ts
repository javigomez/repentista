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
  type CoherenceAssessmentRecord,
  type QuatrainCandidate,
  type QuatrainCandidateState,
  type VerseSlot,
} from "../../domain/quatrain-candidate/index.js";

export const COHERENCE_RUBRIC_VERSION = "0.1.0" as const;
export const COHERENCE_NOTE_MINIMUM = 0;
export const COHERENCE_NOTE_MAXIMUM = 15;
export const COHERENCE_CONFIDENCE_MINIMUM = 0;
export const COHERENCE_CONFIDENCE_MAXIMUM = 1;

const VERSE_SLOTS: readonly VerseSlot[] = Object.freeze(["V1", "V2", "V3", "V4"]);
const VERSE_SLOT_SET: ReadonlySet<VerseSlot> = new Set(VERSE_SLOTS);

const TRANSITION_STEPS: readonly { readonly from: VerseSlot; readonly to: VerseSlot }[] =
  Object.freeze([
    Object.freeze({ from: "V1" as VerseSlot, to: "V2" as VerseSlot }),
    Object.freeze({ from: "V2" as VerseSlot, to: "V3" as VerseSlot }),
    Object.freeze({ from: "V3" as VerseSlot, to: "V4" as VerseSlot }),
  ]);

export const COHERENCE_RUBRIC_PROMPT: StructuredLlmPrompt = Object.freeze({
  id: "coherence-rubric",
  version: COHERENCE_RUBRIC_VERSION,
  messages: Object.freeze([
    Object.freeze({
      role: "system",
      content:
        "Eres un crítico editorial de coherencia narrativa en castellano. Evalúa si los cuatro versos forman una escena comprensible que progresa de presentación a remate. La coherencia mide continuidad de referentes, causalidad y progresión entre versos; no evalúa humor, naturalidad, remate ni métrica. Un giro absurdo puede ser coherente si mantiene sus referentes y su lógica interna, y un remate brillante no rescata una secuencia inconexa. No recompenses defensas teóricas.",
    }),
    Object.freeze({
      role: "user",
      content:
        "Recibes el plan (roles y anclas semánticas de cada verso) junto al texto final. Compara la intención declarada con la realización y califica la coherencia global de 0 a 15 (entero), con una confianza de 0 a 1.\n\nPara cada transición V1→V2, V2→V3 y V3→V4, declara el tipo de relación (continuidad de referente, causalidad, progresión, ruptura, sin conexión…) y cita el referente o vínculo observable que la justifica. Si un referente no está explícito y debes inventarlo, márcalo y reduce la confianza.\n\nDevuelve exclusivamente el objeto JSON con los campos note, confidence y transitions (cada transición con from, to, relation y evidence).",
    }),
  ]),
});

export interface CoherenceVerse {
  readonly slot: VerseSlot;
  readonly text: string;
}

export interface CoherenceAssessmentRequest {
  readonly candidate: QuatrainCandidate;
  readonly verses: readonly CoherenceVerse[];
  readonly generator: StructuredLlmGenerationPort;
  readonly limits: StructuredLlmLimits;
}

export type CoherenceAssessmentFailure =
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
      readonly code: "LLM_ASSESSMENT_FAILED";
      readonly message: string;
      readonly cause: StructuredLlmGenerationError;
    };

export type CoherenceAssessmentResult =
  | { readonly ok: true; readonly value: CoherenceAssessmentRecord }
  | { readonly ok: false; readonly error: CoherenceAssessmentFailure };

interface CoherenceLlmTransition {
  readonly from: VerseSlot;
  readonly to: VerseSlot;
  readonly relation: string;
  readonly evidence: string;
}

interface CoherenceLlmOutput {
  readonly note: number;
  readonly confidence: number;
  readonly transitions: readonly CoherenceLlmTransition[];
}

const coherenceOutputSchema: StructuredLlmOutputSchema<CoherenceLlmOutput> = Object.freeze({
  name: "coherence-assessment",
  version: "0.1.0",
  validate(value: unknown): StructuredLlmSchemaValidationResult<CoherenceLlmOutput> {
    if (!isRecord(value)) {
      return {
        ok: false as const,
        issues: Object.freeze([{ path: "$", message: "Expected an object." }]),
      };
    }

    const issues: StructuredLlmValidationIssue[] = [];

    for (const field of Object.keys(value)) {
      if (field !== "note" && field !== "confidence" && field !== "transitions") {
        issues.push({ path: `$.${field}`, message: "Unexpected field." });
      }
    }

    const rawNote = value.note;
    const noteIsValid =
      typeof rawNote === "number" &&
      Number.isInteger(rawNote) &&
      rawNote >= COHERENCE_NOTE_MINIMUM &&
      rawNote <= COHERENCE_NOTE_MAXIMUM;

    if (!noteIsValid) {
      issues.push({
        path: "$.note",
        message: `Expected an integer between ${COHERENCE_NOTE_MINIMUM} and ${COHERENCE_NOTE_MAXIMUM}.`,
      });
    }

    const rawConfidence = value.confidence;
    const confidenceIsValid =
      typeof rawConfidence === "number" &&
      Number.isFinite(rawConfidence) &&
      rawConfidence >= COHERENCE_CONFIDENCE_MINIMUM &&
      rawConfidence <= COHERENCE_CONFIDENCE_MAXIMUM;

    if (!confidenceIsValid) {
      issues.push({
        path: "$.confidence",
        message: `Expected a number between ${COHERENCE_CONFIDENCE_MINIMUM} and ${COHERENCE_CONFIDENCE_MAXIMUM}.`,
      });
    }

    const transitions: CoherenceLlmTransition[] = [];

    if (!Array.isArray(value.transitions)) {
      issues.push({ path: "$.transitions", message: "Expected an array." });
    } else if (value.transitions.length !== TRANSITION_STEPS.length) {
      issues.push({
        path: "$.transitions",
        message: "Expected exactly the transitions V1→V2, V2→V3 and V3→V4.",
      });
    } else {
      value.transitions.forEach((item, index) => {
        const basePath = `$.transitions[${index}]`;
        const expected = TRANSITION_STEPS[index] as { readonly from: VerseSlot; readonly to: VerseSlot };

        if (!isRecord(item)) {
          issues.push({ path: basePath, message: "Expected an object." });
          return;
        }

        const from = typeof item.from === "string" ? (item.from as VerseSlot) : undefined;
        const to = typeof item.to === "string" ? (item.to as VerseSlot) : undefined;
        const fromIsValid = from !== undefined && VERSE_SLOT_SET.has(from);
        const toIsValid = to !== undefined && VERSE_SLOT_SET.has(to);
        const matchesStep = fromIsValid && toIsValid && from === expected.from && to === expected.to;

        if (!fromIsValid || !toIsValid) {
          issues.push({ path: basePath, message: "Expected valid verse slots." });
        } else if (!matchesStep) {
          issues.push({
            path: basePath,
            message: `Expected the ${expected.from}→${expected.to} transition.`,
          });
        }

        const relation = typeof item.relation === "string" ? item.relation.trim() : "";

        if (relation.length === 0) {
          issues.push({
            path: `${basePath}.relation`,
            message: "Expected a non-empty relation.",
          });
        }

        const evidence = typeof item.evidence === "string" ? item.evidence.trim() : "";

        if (evidence.length === 0) {
          issues.push({
            path: `${basePath}.evidence`,
            message: "Expected a non-empty evidence.",
          });
        }

        if (
          matchesStep &&
          relation.length > 0 &&
          evidence.length > 0 &&
          from !== undefined &&
          to !== undefined
        ) {
          transitions.push(Object.freeze({ from, to, relation, evidence }));
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
        transitions: Object.freeze(transitions),
      }),
    };
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectVerseText(verses: readonly CoherenceVerse[]): {
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

export async function assessCoherence(
  request: CoherenceAssessmentRequest,
): Promise<CoherenceAssessmentResult> {
  if (!hasPassedHardValidation(request.candidate.state)) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "CANDIDATE_NOT_ELIGIBLE" as const,
        message: `La coherencia solo se evalúa sobre candidatos que superaron los bloqueos duros (estado actual: ${request.candidate.state}).`,
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
        message: "La evaluación de coherencia requiere los cuatro versos del candidato.",
        missingSlots: collected.missingSlots,
      }),
    });
  }

  const generation = await request.generator.generate({
    operation: "assess-coherence",
    prompt: COHERENCE_RUBRIC_PROMPT,
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
    outputSchema: coherenceOutputSchema,
    limits: request.limits,
  });

  if (!generation.ok) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "LLM_ASSESSMENT_FAILED" as const,
        message: "El LLM no pudo producir una evaluación de coherencia conforme al esquema.",
        cause: generation.error,
      }),
    });
  }

  const provenance = generation.value.provenance;

  return Object.freeze({
    ok: true as const,
    value: Object.freeze({
      note: generation.value.data.note,
      confidence: generation.value.data.confidence,
      transitions: Object.freeze(
        generation.value.data.transitions.map((transition) =>
          Object.freeze({
            from: transition.from,
            to: transition.to,
            relation: transition.relation,
            evidence: transition.evidence,
          }),
        ),
      ),
      rubricVersion: COHERENCE_RUBRIC_VERSION,
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

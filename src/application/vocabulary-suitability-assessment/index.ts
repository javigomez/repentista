import {
  normalizeApprovedWordForm,
  type ApprovedWordDictionary,
} from "../../content/approved-word-dictionary/index.js";
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
  VOCABULARY_SUITABILITY_ISSUES,
  type QuatrainCandidate,
  type QuatrainCandidateState,
  type VerseSlot,
  type VocabularyFlaggedWord,
  type VocabularySuitabilityAssessmentRecord,
  type VocabularySuitabilityIssue,
  type VocabularyWordMetadata,
} from "../../domain/quatrain-candidate/index.js";

export const VOCABULARY_SUITABILITY_RUBRIC_VERSION = "0.1.0" as const;
export const VOCABULARY_NOTE_MINIMUM = 0;
export const VOCABULARY_NOTE_MAXIMUM = 10;
export const VOCABULARY_CONFIDENCE_MINIMUM = 0;
export const VOCABULARY_CONFIDENCE_MAXIMUM = 1;

const VERSE_SLOTS: readonly VerseSlot[] = Object.freeze(["V1", "V2", "V3", "V4"]);
const VERSE_SLOT_SET: ReadonlySet<VerseSlot> = new Set(VERSE_SLOTS);

const VOCABULARY_ISSUE_SET: ReadonlySet<VocabularySuitabilityIssue> = new Set(
  VOCABULARY_SUITABILITY_ISSUES,
);

export const VOCABULARY_SUITABILITY_RUBRIC_PROMPT: StructuredLlmPrompt = Object.freeze({
  id: "vocabulary-suitability-rubric",
  version: VOCABULARY_SUITABILITY_RUBRIC_VERSION,
  messages: Object.freeze([
    Object.freeze({
      role: "system",
      content:
        "Eres un crítico editorial de vocabulario en castellano para lectores de 10 a 12 años. Evalúa si el vocabulario completo de la cuarteta es claro, cotidiano y apropiado para esa edad sin resultar condescendiente. No evalúes métrica, rima, diccionario, naturalidad, coherencia, humor ni remate: solo la adecuación del vocabulario. No sustituyas la comprobación de pertenencia al diccionario: las palabras controladas ya fueron validadas. Tu tarea es juzgar si su uso concreto es adecuado para el nivel. Distingue 'infantilizante' (condescendiente, rebaja al lector) de 'fácil' (claro y cotidiano): una palabra clara no es infantilizante. Una palabra aprobada puede ser un problema blando si resulta demasiado culta, abstracta o ambigua en su uso concreto; en ese caso la señalas sin afirmar que no pertenece al diccionario. Si una palabra adecuada no produce obstáculo, no la señales.",
    }),
    Object.freeze({
      role: "user",
      content:
        "Califica la adecuación global del vocabulario de 0 a 10 (entero) y devuelve una confianza de 0 a 1. Señala únicamente las palabras problemáticas, cada una con slot (V1-V4), la forma exacta tal y como aparece, un motivo de la lista DEMASIADO_CULTO, ABSTRACTO, INFANTILIZANTE o AMBIGUO_CONTEXTUAL, una razón observable en el uso concreto y alternativas conceptuales (palabras más adecuadas, sin reescribir el verso; lista vacía si no hay alternativa clara).\n\nDevuelve exclusivamente el objeto JSON con los campos note, confidence y flaggedWords (lista de objetos con slot, form, issue, reason y alternatives).",
    }),
  ]),
});

export interface VocabularySuitabilityVerse {
  readonly slot: VerseSlot;
  readonly text: string;
}

export interface VocabularySuitabilityAssessmentRequest {
  readonly candidate: QuatrainCandidate;
  readonly verses: readonly VocabularySuitabilityVerse[];
  readonly dictionary: ApprovedWordDictionary;
  readonly dictionaryVersion: string;
  readonly generator: StructuredLlmGenerationPort;
  readonly limits: StructuredLlmLimits;
}

export type VocabularySuitabilityAssessmentFailure =
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
      readonly form: string;
    }
  | {
      readonly code: "LLM_ASSESSMENT_FAILED";
      readonly message: string;
      readonly cause: StructuredLlmGenerationError;
    };

export type VocabularySuitabilityAssessmentResult =
  | { readonly ok: true; readonly value: VocabularySuitabilityAssessmentRecord }
  | { readonly ok: false; readonly error: VocabularySuitabilityAssessmentFailure };

interface VocabularyLlmFlaggedWord {
  readonly slot: VerseSlot;
  readonly form: string;
  readonly issue: VocabularySuitabilityIssue;
  readonly reason: string;
  readonly alternatives: readonly string[];
}

interface VocabularyLlmOutput {
  readonly note: number;
  readonly confidence: number;
  readonly flaggedWords: readonly VocabularyLlmFlaggedWord[];
}

const vocabularyOutputSchema: StructuredLlmOutputSchema<VocabularyLlmOutput> = Object.freeze({
  name: "vocabulary-suitability-assessment",
  version: "0.1.0",
  validate(value: unknown): StructuredLlmSchemaValidationResult<VocabularyLlmOutput> {
    if (!isRecord(value)) {
      return {
        ok: false as const,
        issues: Object.freeze([{ path: "$", message: "Expected an object." }]),
      };
    }

    const issues: StructuredLlmValidationIssue[] = [];

    for (const field of Object.keys(value)) {
      if (field !== "note" && field !== "confidence" && field !== "flaggedWords") {
        issues.push({ path: `$.${field}`, message: "Unexpected field." });
      }
    }

    const rawNote = value.note;
    const noteIsValid =
      typeof rawNote === "number" &&
      Number.isInteger(rawNote) &&
      rawNote >= VOCABULARY_NOTE_MINIMUM &&
      rawNote <= VOCABULARY_NOTE_MAXIMUM;

    if (!noteIsValid) {
      issues.push({
        path: "$.note",
        message: `Expected an integer between ${VOCABULARY_NOTE_MINIMUM} and ${VOCABULARY_NOTE_MAXIMUM}.`,
      });
    }

    const rawConfidence = value.confidence;
    const confidenceIsValid =
      typeof rawConfidence === "number" &&
      Number.isFinite(rawConfidence) &&
      rawConfidence >= VOCABULARY_CONFIDENCE_MINIMUM &&
      rawConfidence <= VOCABULARY_CONFIDENCE_MAXIMUM;

    if (!confidenceIsValid) {
      issues.push({
        path: "$.confidence",
        message: `Expected a number between ${VOCABULARY_CONFIDENCE_MINIMUM} and ${VOCABULARY_CONFIDENCE_MAXIMUM}.`,
      });
    }

    const flaggedWords: VocabularyLlmFlaggedWord[] = [];

    if (!Array.isArray(value.flaggedWords)) {
      issues.push({ path: "$.flaggedWords", message: "Expected an array." });
    } else {
      value.flaggedWords.forEach((item, index) => {
        const basePath = `$.flaggedWords[${index}]`;

        if (!isRecord(item)) {
          issues.push({ path: basePath, message: "Expected an object." });
          return;
        }

        for (const field of Object.keys(item)) {
          if (
            field !== "slot" &&
            field !== "form" &&
            field !== "issue" &&
            field !== "reason" &&
            field !== "alternatives"
          ) {
            issues.push({ path: `${basePath}.${field}`, message: "Unexpected field." });
          }
        }

        const slot = typeof item.slot === "string" ? (item.slot as VerseSlot) : undefined;
        const slotIsValid = slot !== undefined && VERSE_SLOT_SET.has(slot);

        if (!slotIsValid) {
          issues.push({ path: `${basePath}.slot`, message: "Expected a valid verse slot." });
        }

        const form = typeof item.form === "string" ? item.form.trim() : "";

        if (form.length === 0) {
          issues.push({ path: `${basePath}.form`, message: "Expected a non-empty word form." });
        }

        const issue =
          typeof item.issue === "string" ? (item.issue as VocabularySuitabilityIssue) : undefined;
        const issueIsValid = issue !== undefined && VOCABULARY_ISSUE_SET.has(issue);

        if (!issueIsValid) {
          issues.push({
            path: `${basePath}.issue`,
            message: `Expected one of ${VOCABULARY_SUITABILITY_ISSUES.join(", ")}.`,
          });
        }

        const reason = typeof item.reason === "string" ? item.reason.trim() : "";

        if (reason.length === 0) {
          issues.push({ path: `${basePath}.reason`, message: "Expected a non-empty reason." });
        }

        const alternatives: string[] = [];

        if (!Array.isArray(item.alternatives)) {
          issues.push({ path: `${basePath}.alternatives`, message: "Expected an array." });
        } else {
          item.alternatives.forEach((alternative, alternativeIndex) => {
            if (typeof alternative !== "string" || alternative.trim().length === 0) {
              issues.push({
                path: `${basePath}.alternatives[${alternativeIndex}]`,
                message: "Expected a non-empty alternative string.",
              });
            } else {
              alternatives.push(alternative.trim());
            }
          });
        }

        if (slotIsValid && form.length > 0 && issueIsValid && reason.length > 0) {
          flaggedWords.push(
            Object.freeze({
              slot: slot as VerseSlot,
              form,
              issue: issue as VocabularySuitabilityIssue,
              reason,
              alternatives: Object.freeze(alternatives),
            }),
          );
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
        flaggedWords: Object.freeze(flaggedWords),
      }),
    };
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function rawTokens(text: string): readonly string[] {
  return text
    .toLocaleLowerCase("es")
    .split(/\s+/u)
    .map((token) => token.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter((token) => token.length > 0);
}

function collectVerseText(verses: readonly VocabularySuitabilityVerse[]): {
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

function collectWordMetadata(
  verses: readonly VocabularySuitabilityVerse[],
  dictionary: ApprovedWordDictionary,
  dictionaryVersion: string,
): readonly VocabularyWordMetadata[] {
  const metadata: VocabularyWordMetadata[] = [];

  for (const verse of verses) {
    for (const token of rawTokens(verse.text)) {
      const lookup = dictionary.findByForm({ version: dictionaryVersion, form: token });

      if (lookup.ok && lookup.status !== "missing") {
        metadata.push(
          Object.freeze({
            slot: verse.slot,
            form: token,
            normalizedForm: lookup.entry.normalizedForm,
            dictionaryLevel: lookup.entry.level,
          }),
        );
      }
    }
  }

  return Object.freeze(metadata);
}

function findMissingCitation(
  output: VocabularyLlmOutput,
  bySlot: ReadonlyMap<VerseSlot, string>,
): { readonly slot: VerseSlot; readonly form: string } | undefined {
  for (const flaggedWord of output.flaggedWords) {
    const verseText = bySlot.get(flaggedWord.slot);

    if (verseText === undefined) {
      return { slot: flaggedWord.slot, form: flaggedWord.form };
    }

    const target = normalizeApprovedWordForm(flaggedWord.form);
    const present = rawTokens(verseText).some(
      (token) => normalizeApprovedWordForm(token) === target,
    );

    if (!present) {
      return { slot: flaggedWord.slot, form: flaggedWord.form };
    }
  }

  return undefined;
}

export async function assessVocabularySuitability(
  request: VocabularySuitabilityAssessmentRequest,
): Promise<VocabularySuitabilityAssessmentResult> {
  if (!hasPassedHardValidation(request.candidate.state)) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "CANDIDATE_NOT_ELIGIBLE" as const,
        message: `La adecuación del vocabulario solo se evalúa sobre candidatos que superaron los bloqueos duros (estado actual: ${request.candidate.state}).`,
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
        message: "La evaluación de vocabulario requiere los cuatro versos del candidato.",
        missingSlots: collected.missingSlots,
      }),
    });
  }

  const wordMetadata = collectWordMetadata(
    request.verses,
    request.dictionary,
    request.dictionaryVersion,
  );

  const generation = await request.generator.generate({
    operation: "assess-vocabulary-suitability",
    prompt: VOCABULARY_SUITABILITY_RUBRIC_PROMPT,
    input: Object.freeze({
      verses: Object.freeze(
        VERSE_SLOTS.map((slot) =>
          Object.freeze({ slot, text: collected.bySlot.get(slot) }),
        ),
      ),
      dictionaryMetadata: wordMetadata,
    }),
    outputSchema: vocabularyOutputSchema,
    limits: request.limits,
  });

  if (!generation.ok) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "LLM_ASSESSMENT_FAILED" as const,
        message: "El LLM no pudo producir una evaluación de vocabulario conforme al esquema.",
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
        message: "La evaluación de vocabulario señala una palabra que no aparece en el verso evaluado.",
        slot: missingCitation.slot,
        form: missingCitation.form,
      }),
    });
  }

  const provenance = generation.value.provenance;

  const flaggedWords: readonly VocabularyFlaggedWord[] = Object.freeze(
    generation.value.data.flaggedWords.map((flaggedWord) =>
      Object.freeze({
        slot: flaggedWord.slot,
        form: flaggedWord.form,
        issue: flaggedWord.issue,
        reason: flaggedWord.reason,
        alternatives: Object.freeze([...flaggedWord.alternatives]),
      }),
    ),
  );

  return Object.freeze({
    ok: true as const,
    value: Object.freeze({
      note: generation.value.data.note,
      confidence: generation.value.data.confidence,
      wordMetadata,
      flaggedWords,
      dictionaryVersion: request.dictionaryVersion,
      rubricVersion: VOCABULARY_SUITABILITY_RUBRIC_VERSION,
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

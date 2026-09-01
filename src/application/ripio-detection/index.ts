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
  type QuatrainCandidate,
  type QuatrainCandidateState,
  type RipioDetectionRecord,
  type RipioFragment,
  type RipioSeverity,
  type RipioSignal,
  type VerseSlot,
} from "../../domain/quatrain-candidate/index.js";

export const RIPIO_DETECTOR_VERSION = "0.1.0" as const;
export const RIPIO_CONFIDENCE_MINIMUM = 0;
export const RIPIO_CONFIDENCE_MAXIMUM = 1;

const VERSE_SLOTS: readonly VerseSlot[] = Object.freeze(["V1", "V2", "V3", "V4"]);
const VERSE_SLOT_SET: ReadonlySet<VerseSlot> = new Set(VERSE_SLOTS);

const RIPIO_SEVERITIES: readonly RipioSeverity[] = Object.freeze([
  "NINGUNO",
  "LEVE",
  "MODERADO",
  "GRAVE",
]);

const RIPIO_SEVERITY_SET: ReadonlySet<RipioSeverity> = new Set(RIPIO_SEVERITIES);

const RIPIO_SEVERITY_RANK: Readonly<Record<RipioSeverity, number>> = Object.freeze({
  NINGUNO: 0,
  LEVE: 1,
  MODERADO: 2,
  GRAVE: 3,
});

// --- Deterministic patterns (versioned editorial signals) -----------------

export const RIPIO_PATTERN_CATALOG_VERSION = "0.1.0" as const;
export const RIPIO_FILLER_PATTERN_ID = "ripio.filler" as const;
export const RIPIO_MORPHOLOGICAL_PATTERN_ID = "ripio.morphological-repetition" as const;

const FILLER_PHRASES: readonly string[] = Object.freeze([
  "es que",
  "o sea",
  "pues nada",
  "total que",
  "en fin",
  "a decir verdad",
]);

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const FILLER_PATTERNS: readonly { readonly phrase: string; readonly regex: RegExp }[] =
  Object.freeze(
    FILLER_PHRASES.map((phrase) => ({
      phrase,
      regex: new RegExp(`\\b${escapeRegex(phrase)}\\b`, "iu"),
    })),
  );

interface MorphologicalSuffix {
  readonly group: string;
  readonly suffix: string;
  readonly label: string;
}

const MORPHOLOGICAL_SUFFIXES: readonly MorphologicalSuffix[] = Object.freeze([
  Object.freeze({ group: "adverbio-mente", suffix: "mente", label: "adverbio en -mente" }),
  Object.freeze({ group: "gerundio", suffix: "ando", label: "gerundio en -ando/-iendo" }),
  Object.freeze({ group: "gerundio", suffix: "iendo", label: "gerundio en -ando/-iendo" }),
  Object.freeze({ group: "sustantivo-cion", suffix: "ción", label: "sustantivo en -ción" }),
]);

const MORPHOLOGICAL_REPETITION_THRESHOLD = 3;

const WORD_PATTERN = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+/gu;

export const RIPIO_DETECTION_PROMPT: StructuredLlmPrompt = Object.freeze({
  id: "ripio-detection-rubric",
  version: RIPIO_DETECTOR_VERSION,
  messages: Object.freeze([
    Object.freeze({
      role: "system",
      content:
        "Eres un crítico editorial de ripio en castellano. Detecta frases de relleno, causalidades inventadas y giros que solo existen para satisfacer la rima. Aplica la prueba editorial: si eliminamos la obligación de rimar, ¿seguiría existiendo esta frase con esta relación de significado? El humor absurdo intencional no es ripio si la frase tiene su propia lógica interna; el relleno sí lo es. No evalúes métrica, rima, diccionario ni humor. No recompenses defensas teóricas.",
    }),
    Object.freeze({
      role: "user",
      content:
        "Recibes el plan (roles y anclas semánticas de cada verso), el texto final y las señales deterministas detectadas (con su identificador de patrón). Las señales son evidencia, no veredicto: confirma o descarta ripio y añade tu propio juicio.\n\nEjemplos ancla aprobados (sin ripio):\n- \"Subí deprisa al tejado porque estaba muy mojado.\"\n- \"El gato promete compartir la merienda.\"\n\nEjemplos ancla rechazados (ripio):\n- \"El dragón estaba sentado porque era bastante cuadrado.\"\n- \"Y es que la rima me obliga a rellenar el verso.\"\n\nDevuelve exclusivamente el objeto JSON con los campos severity (NINGUNO, LEVE, MODERADO o GRAVE), confidence (0 a 1), explanation (breve) y fragments (cada uno con slot, fragment y reason). Si no hay ripio, devuelve severity NINGUNO, fragments vacío y explica la función de los versos.",
    }),
  ]),
});

export interface RipioVerse {
  readonly slot: VerseSlot;
  readonly text: string;
}

export interface RipioDetectionRequest {
  readonly candidate: QuatrainCandidate;
  readonly verses: readonly RipioVerse[];
  readonly generator: StructuredLlmGenerationPort;
  readonly limits: StructuredLlmLimits;
}

export type RipioDetectionFailure =
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

export type RipioDetectionResult =
  | { readonly ok: true; readonly value: RipioDetectionRecord }
  | { readonly ok: false; readonly error: RipioDetectionFailure };

interface RipioLlmOutput {
  readonly severity: RipioSeverity;
  readonly confidence: number;
  readonly fragments: readonly RipioFragment[];
  readonly explanation: string;
}

const ripioOutputSchema: StructuredLlmOutputSchema<RipioLlmOutput> = Object.freeze({
  name: "ripio-detection",
  version: RIPIO_DETECTOR_VERSION,
  validate(value: unknown): StructuredLlmSchemaValidationResult<RipioLlmOutput> {
    if (!isRecord(value)) {
      return {
        ok: false as const,
        issues: Object.freeze([{ path: "$", message: "Expected an object." }]),
      };
    }

    const issues: StructuredLlmValidationIssue[] = [];

    for (const field of Object.keys(value)) {
      if (field !== "severity" && field !== "confidence" && field !== "fragments" && field !== "explanation") {
        issues.push({ path: `$.${field}`, message: "Unexpected field." });
      }
    }

    const severity = typeof value.severity === "string" ? (value.severity as RipioSeverity) : undefined;

    if (severity === undefined || !RIPIO_SEVERITY_SET.has(severity)) {
      issues.push({
        path: "$.severity",
        message: "Expected one of NINGUNO, LEVE, MODERADO, GRAVE.",
      });
    }

    const confidence = value.confidence;
    const confidenceIsValid =
      typeof confidence === "number" &&
      Number.isFinite(confidence) &&
      confidence >= RIPIO_CONFIDENCE_MINIMUM &&
      confidence <= RIPIO_CONFIDENCE_MAXIMUM;

    if (!confidenceIsValid) {
      issues.push({
        path: "$.confidence",
        message: `Expected a number between ${RIPIO_CONFIDENCE_MINIMUM} and ${RIPIO_CONFIDENCE_MAXIMUM}.`,
      });
    }

    const explanation = typeof value.explanation === "string" ? value.explanation.trim() : "";

    if (explanation.length === 0) {
      issues.push({ path: "$.explanation", message: "Expected a non-empty explanation." });
    }

    const fragments: RipioFragment[] = [];
    const seenFragments = new Set<string>();

    if (!Array.isArray(value.fragments)) {
      issues.push({ path: "$.fragments", message: "Expected an array." });
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
          issues.push({ path: `${basePath}.fragment`, message: "Expected a non-empty citation." });
        }

        const reason = typeof item.reason === "string" ? item.reason.trim() : "";

        if (reason.length === 0) {
          issues.push({ path: `${basePath}.reason`, message: "Expected a non-empty reason." });
        }

        if (slotIsValid && fragment.length > 0 && reason.length > 0) {
          const key = `${slot}\u0000${fragment}`;

          if (seenFragments.has(key)) {
            issues.push({ path: basePath, message: "Fragment must not be repeated." });
          } else {
            seenFragments.add(key);
            fragments.push(Object.freeze({ slot: slot as VerseSlot, fragment, reason }));
          }
        }
      });
    }

    if (issues.length > 0) {
      return { ok: false as const, issues: Object.freeze(issues) };
    }

    return {
      ok: true as const,
      value: Object.freeze({
        severity: severity as RipioSeverity,
        confidence: confidence as number,
        fragments: Object.freeze(fragments),
        explanation,
      }),
    };
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectVerseText(verses: readonly RipioVerse[]): {
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

function collectFillerSignals(bySlot: ReadonlyMap<VerseSlot, string>): readonly RipioSignal[] {
  const signals: RipioSignal[] = [];

  for (const slot of VERSE_SLOTS) {
    const text = bySlot.get(slot);

    if (text === undefined) {
      continue;
    }

    for (const { phrase, regex } of FILLER_PATTERNS) {
      const match = text.match(regex);

      if (match === null) {
        continue;
      }

      signals.push(
        Object.freeze({
          patternId: RIPIO_FILLER_PATTERN_ID,
          patternVersion: RIPIO_PATTERN_CATALOG_VERSION,
          slot,
          fragment: match[0],
          severity: "LEVE" as const,
          reason: `muletilla de relleno (${phrase}) que no aporta significado`,
        }),
      );
    }
  }

  return Object.freeze(signals);
}

function extractWords(text: string): readonly string[] {
  return text.match(WORD_PATTERN) ?? [];
}

function collectMorphologicalRepetitionSignals(
  bySlot: ReadonlyMap<VerseSlot, string>,
): readonly RipioSignal[] {
  const occurrences = new Map<
    string,
    { readonly count: number; readonly firstSlot: VerseSlot; readonly firstWord: string }
  >();

  for (const slot of VERSE_SLOTS) {
    const text = bySlot.get(slot);

    if (text === undefined) {
      continue;
    }

    for (const word of extractWords(text)) {
      const lower = word.toLocaleLowerCase();

      for (const { group, suffix } of MORPHOLOGICAL_SUFFIXES) {
        if (!lower.endsWith(suffix) || lower.length < suffix.length + 1) {
          continue;
        }

        const existing = occurrences.get(group);

        if (existing === undefined) {
          occurrences.set(group, { count: 1, firstSlot: slot, firstWord: word });
        } else {
          occurrences.set(group, {
            ...existing,
            count: existing.count + 1,
          });
        }
      }
    }
  }

  const signals: RipioSignal[] = [];

  for (const [group, occurrence] of occurrences) {
    if (occurrence.count < MORPHOLOGICAL_REPETITION_THRESHOLD) {
      continue;
    }

    const label =
      MORPHOLOGICAL_SUFFIXES.find((entry) => entry.group === group)?.label ?? group;

    signals.push(
      Object.freeze({
        patternId: RIPIO_MORPHOLOGICAL_PATTERN_ID,
        patternVersion: RIPIO_PATTERN_CATALOG_VERSION,
        slot: occurrence.firstSlot,
        fragment: occurrence.firstWord,
        severity: "LEVE" as const,
        reason: `${label} repetido ${occurrence.count} veces en la cuarteta`,
      }),
    );
  }

  return Object.freeze(signals);
}

function collectDeterministicSignals(
  bySlot: ReadonlyMap<VerseSlot, string>,
): readonly RipioSignal[] {
  return Object.freeze([
    ...collectFillerSignals(bySlot),
    ...collectMorphologicalRepetitionSignals(bySlot),
  ]);
}

function maxSeverity(values: readonly RipioSeverity[]): RipioSeverity {
  let max: RipioSeverity = "NINGUNO";

  for (const value of values) {
    if (RIPIO_SEVERITY_RANK[value] > RIPIO_SEVERITY_RANK[max]) {
      max = value;
    }
  }

  return max;
}

function mergeFragments(
  signals: readonly RipioSignal[],
  llmFragments: readonly RipioFragment[],
): readonly RipioFragment[] {
  const seen = new Set<string>();
  const fragments: RipioFragment[] = [];

  for (const signal of signals) {
    const key = `${signal.slot}\u0000${signal.fragment}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    fragments.push(
      Object.freeze({
        slot: signal.slot,
        fragment: signal.fragment,
        reason: signal.reason,
      }),
    );
  }

  for (const llmFragment of llmFragments) {
    const key = `${llmFragment.slot}\u0000${llmFragment.fragment}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    fragments.push(llmFragment);
  }

  return Object.freeze(fragments);
}

function findMissingCitation(
  fragments: readonly RipioFragment[],
  bySlot: ReadonlyMap<VerseSlot, string>,
): { readonly slot: VerseSlot; readonly fragment: string } | undefined {
  for (const fragment of fragments) {
    const verseText = bySlot.get(fragment.slot);

    if (verseText === undefined || !verseText.includes(fragment.fragment)) {
      return { slot: fragment.slot, fragment: fragment.fragment };
    }
  }

  return undefined;
}

export async function detectRipio(
  request: RipioDetectionRequest,
): Promise<RipioDetectionResult> {
  if (!hasPassedHardValidation(request.candidate.state)) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "CANDIDATE_NOT_ELIGIBLE" as const,
        message: `El ripio solo se evalúa sobre candidatos que superaron los bloqueos duros (estado actual: ${request.candidate.state}).`,
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
        message: "La detección de ripio requiere los cuatro versos del candidato.",
        missingSlots: collected.missingSlots,
      }),
    });
  }

  const signals = collectDeterministicSignals(collected.bySlot);

  const generation = await request.generator.generate({
    operation: "detect-ripio",
    prompt: RIPIO_DETECTION_PROMPT,
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
      signals: Object.freeze(
        signals.map((signal) =>
          Object.freeze({
            patternId: signal.patternId,
            patternVersion: signal.patternVersion,
            slot: signal.slot,
            fragment: signal.fragment,
            severity: signal.severity,
            reason: signal.reason,
          }),
        ),
      ),
    }),
    outputSchema: ripioOutputSchema,
    limits: request.limits,
  });

  if (!generation.ok) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "LLM_ASSESSMENT_FAILED" as const,
        message: "El LLM no pudo producir una detección de ripio conforme al esquema.",
        cause: generation.error,
      }),
    });
  }

  const missingCitation = findMissingCitation(generation.value.data.fragments, collected.bySlot);

  if (missingCitation !== undefined) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "CITATION_NOT_IN_VERSE" as const,
        message: "La detección cita un fragmento que no aparece en el verso evaluado.",
        slot: missingCitation.slot,
        fragment: missingCitation.fragment,
      }),
    });
  }

  const llmVerdict = Object.freeze({
    severity: generation.value.data.severity,
    confidence: generation.value.data.confidence,
    fragments: Object.freeze(
      generation.value.data.fragments.map((fragment) =>
        Object.freeze({
          slot: fragment.slot,
          fragment: fragment.fragment,
          reason: fragment.reason,
        }),
      ),
    ),
    explanation: generation.value.data.explanation,
  });

  const severity = maxSeverity([llmVerdict.severity, ...signals.map((signal) => signal.severity)]);
  const fragments = mergeFragments(signals, llmVerdict.fragments);
  const provenance = generation.value.provenance;

  return Object.freeze({
    ok: true as const,
    value: Object.freeze({
      presence: severity !== "NINGUNO",
      severity,
      fragments,
      signals,
      llm: llmVerdict,
      rubricVersion: RIPIO_DETECTOR_VERSION,
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

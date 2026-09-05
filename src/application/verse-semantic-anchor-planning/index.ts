import {
  VERSE_SLOT_CONTRACT,
  type VerseRole,
  type VerseSlot,
} from "../../domain/quatrain-candidate/index.js";
import type {
  StructuredLlmGenerationError,
  StructuredLlmGenerationPort,
  StructuredLlmGenerationProvenance,
  StructuredLlmOutputSchema,
  StructuredLlmPrompt,
  StructuredLlmUsage,
} from "../../ports/structured-llm-generation/index.js";

export const VERSE_SEMANTIC_ANCHOR_PLANNING_VERSION = "verse-semantic-anchor-planning-0.1.0";

export type AnchorWarningKind = "CLICHE" | "AMBIGUITY" | "WEAK_CAUSALITY";

export interface AnchorWarning {
  readonly kind: AnchorWarningKind;
  readonly detail: string;
}

export interface FixedFinalWord {
  readonly id: string;
  readonly word: string;
}

export interface FixedFinalWords {
  readonly v2: FixedFinalWord;
  readonly v4: FixedFinalWord;
}

export interface VerseSemanticPlan {
  readonly centralIdea: string;
  readonly scene: string;
  readonly twist: string;
  readonly finalIntent: string;
  readonly verseFunctions: Readonly<Record<VerseSlot, string>>;
}

export interface VerseSemanticAnchorPlanningRequest {
  readonly semanticPlan: VerseSemanticPlan;
  readonly fixedFinalWords: FixedFinalWords;
}

export interface VerseSemanticAnchorPlanningDependencies {
  readonly planner: StructuredLlmGenerationPort;
}

export interface VerseAnchor {
  readonly slot: VerseSlot;
  readonly role: VerseRole;
  readonly objective: string;
  readonly mandatoryElements: readonly string[];
  readonly optionalElements: readonly string[];
  readonly forbiddenElements: readonly string[];
  readonly fixedFinalWord?: FixedFinalWord;
}

export interface VerseSemanticAnchorPlan {
  readonly scene: string;
  readonly sharedReferents: readonly string[];
  readonly anchors: readonly VerseAnchor[];
  readonly warnings: readonly AnchorWarning[];
  readonly provenance: StructuredLlmGenerationProvenance;
  readonly usage: StructuredLlmUsage;
}

export type VerseSemanticAnchorPlanningFailure =
  | {
      readonly code: "PLANNER_FAILED";
      readonly message: string;
      readonly cause: StructuredLlmGenerationError;
    }
  | {
      readonly code: "MISSING_VERSE_ROLE";
      readonly message: string;
      readonly missingSlots: readonly VerseSlot[];
      readonly receivedSlots: readonly VerseSlot[];
    }
  | {
      readonly code: "INVALID_VERSE_ROLE";
      readonly message: string;
      readonly slot: VerseSlot;
      readonly expectedRole: VerseRole;
      readonly receivedRole: VerseRole;
    }
  | {
      readonly code: "FIXED_WORD_CONTRADICTION";
      readonly message: string;
      readonly slot: VerseSlot;
      readonly expected: FixedFinalWord;
      readonly received?: FixedFinalWord;
    }
  | {
      readonly code: "CONTRADICTORY_ANCHORS";
      readonly message: string;
      readonly conflicts: readonly string[];
    }
  | {
      readonly code: "VERSE_LIKE_TEXT";
      readonly message: string;
      readonly slot: VerseSlot;
      readonly field: string;
      readonly fragment: string;
    }
  | {
      readonly code: "ISOLATED_IDEAS";
      readonly message: string;
    };

export type VerseSemanticAnchorPlanningResult =
  | { readonly ok: true; readonly value: VerseSemanticAnchorPlan }
  | { readonly ok: false; readonly error: VerseSemanticAnchorPlanningFailure };

interface VerseSemanticAnchorLlmAnchor {
  readonly slot: VerseSlot;
  readonly role: VerseRole;
  readonly objective: string;
  readonly mandatoryElements: readonly string[];
  readonly optionalElements: readonly string[];
  readonly forbiddenElements: readonly string[];
  readonly fixedFinalWord?: FixedFinalWord;
}

interface VerseSemanticAnchorLlmOutput {
  readonly scene: string;
  readonly sharedReferents: readonly string[];
  readonly warnings: readonly AnchorWarning[];
  readonly anchors: readonly VerseSemanticAnchorLlmAnchor[];
}

const VERSES: readonly VerseSlot[] = Object.freeze(["V1", "V2", "V3", "V4"]);
const ROLES: readonly VerseRole[] = Object.freeze([
  "PRESENTACION",
  "PREPARACION",
  "GIRO_TENSION",
  "REMATE",
]);
const WARNING_KINDS: readonly AnchorWarningKind[] = Object.freeze([
  "CLICHE",
  "AMBIGUITY",
  "WEAK_CAUSALITY",
]);

const roleBySlot = Object.freeze(
  Object.fromEntries(VERSE_SLOT_CONTRACT.map(({ slot, role }) => [slot, role])) as Readonly<
    Record<VerseSlot, VerseRole>
  >,
);

const expectedSlots = Object.freeze(VERSE_SLOT_CONTRACT.map(({ slot }) => slot));

const FIXED_WORD_SLOTS = Object.freeze(["V2", "V4"] as const);

const ANCHOR_PLANNING_PROMPT: StructuredLlmPrompt = Object.freeze({
  id: "generation.verse-semantic-anchor-planning",
  version: "0.1.0",
  messages: Object.freeze([
    Object.freeze({
      role: "system",
      content:
        "Eres un planificador de cuartetas humorísticas. Asigna anclas semánticas por verso sin redactar versos completos.",
    }),
    Object.freeze({
      role: "user",
      content:
        "Para cada verso (V1 presentación, V2 preparación, V3 giro/tensión, V4 remate) declara objetivo, elementos obligatorios, opcionales y prohibidos. Conserva las palabras finales fijadas de V2 y V4. Comparte referentes o relaciones entre los cuatro versos para mantener una única escena. Registra advertencias de clichés, ambigüedad y causalidad débil.",
    }),
  ]),
});

const ANCHOR_PLANNING_LIMITS = Object.freeze({
  timeoutMs: 1_000,
  maxOutputTokens: 1_200,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeText = (value: string): string =>
  value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("es")
    .trim()
    .replace(/\s+/gu, " ");

const validateStringArray = (
  value: unknown,
  path: string,
  issues: { readonly path: string; readonly message: string }[],
): void => {
  if (!Array.isArray(value)) {
    issues.push({ path, message: "Expected an array of non-empty strings." });
    return;
  }

  value.forEach((item, index) => {
    if (typeof item !== "string" || item.trim().length === 0) {
      issues.push({ path: `${path}[${index}]`, message: "Expected a non-empty string." });
    }
  });
};

const anchorOutputSchema: StructuredLlmOutputSchema<VerseSemanticAnchorLlmOutput> =
  Object.freeze({
    name: "verse-semantic-anchor-plan",
    version: "0.1.0",
    validate(value: unknown) {
      if (!isRecord(value)) {
        return {
          ok: false as const,
          issues: Object.freeze([{ path: "$", message: "Expected an object." }]),
        };
      }

      const issues: { readonly path: string; readonly message: string }[] = [];

      if (typeof value.scene !== "string" || value.scene.trim().length === 0) {
        issues.push({ path: "$.scene", message: "Expected a non-empty scene string." });
      }

      validateStringArray(value.sharedReferents, "$.sharedReferents", issues);

      if (!Array.isArray(value.warnings)) {
        issues.push({ path: "$.warnings", message: "Expected an array of warnings." });
      } else {
        value.warnings.forEach((warning, index) => {
          if (!isRecord(warning)) {
            issues.push({ path: `$.warnings[${index}]`, message: "Expected a warning object." });
            return;
          }

          if (!WARNING_KINDS.includes(warning.kind as AnchorWarningKind)) {
            issues.push({
              path: `$.warnings[${index}].kind`,
              message: "Expected a valid warning kind.",
            });
          }

          if (typeof warning.detail !== "string" || warning.detail.trim().length === 0) {
            issues.push({
              path: `$.warnings[${index}].detail`,
              message: "Expected a non-empty warning detail.",
            });
          }
        });
      }

      if (!Array.isArray(value.anchors)) {
        issues.push({ path: "$.anchors", message: "Expected an array of verse anchors." });
      } else {
        value.anchors.forEach((anchor, index) => {
          if (!isRecord(anchor)) {
            issues.push({ path: `$.anchors[${index}]`, message: "Expected an anchor object." });
            return;
          }

          const prefix = `$.anchors[${index}]`;

          if (!VERSES.includes(anchor.slot as VerseSlot)) {
            issues.push({ path: `${prefix}.slot`, message: "Expected a valid verse slot." });
          }

          if (!ROLES.includes(anchor.role as VerseRole)) {
            issues.push({ path: `${prefix}.role`, message: "Expected a valid verse role." });
          }

          if (typeof anchor.objective !== "string" || anchor.objective.trim().length === 0) {
            issues.push({ path: `${prefix}.objective`, message: "Expected a non-empty objective." });
          }

          validateStringArray(anchor.mandatoryElements, `${prefix}.mandatoryElements`, issues);
          validateStringArray(anchor.optionalElements, `${prefix}.optionalElements`, issues);
          validateStringArray(anchor.forbiddenElements, `${prefix}.forbiddenElements`, issues);

          if (anchor.fixedFinalWord !== undefined) {
            if (
              !isRecord(anchor.fixedFinalWord) ||
              typeof anchor.fixedFinalWord.id !== "string" ||
              anchor.fixedFinalWord.id.trim().length === 0 ||
              typeof anchor.fixedFinalWord.word !== "string" ||
              anchor.fixedFinalWord.word.trim().length === 0
            ) {
              issues.push({
                path: `${prefix}.fixedFinalWord`,
                message: "Expected a fixed final word with non-empty id and word.",
              });
            }
          }
        });
      }

      if (issues.length > 0) {
        return { ok: false as const, issues: Object.freeze(issues) };
      }

      return {
        ok: true as const,
        value: value as unknown as VerseSemanticAnchorLlmOutput,
      };
    },
  });

const fixedWordForSlot = (slot: "V2" | "V4", fixedFinalWords: FixedFinalWords): FixedFinalWord =>
  slot === "V2" ? fixedFinalWords.v2 : fixedFinalWords.v4;

const findFixedWordContradiction = (
  anchor: VerseSemanticAnchorLlmAnchor | undefined,
  expected: FixedFinalWord,
  slot: "V2" | "V4",
): VerseSemanticAnchorPlanningFailure | undefined => {
  if (anchor === undefined) {
    return Object.freeze({
      code: "FIXED_WORD_CONTRADICTION" as const,
      message: `El verso ${slot} no declara la palabra final fijada.`,
      slot,
      expected,
    });
  }

  const fixed = anchor.fixedFinalWord;

  if (fixed === undefined) {
    return Object.freeze({
      code: "FIXED_WORD_CONTRADICTION" as const,
      message: `El verso ${slot} no conserva la palabra final fijada.`,
      slot,
      expected,
    });
  }

  if (fixed.id !== expected.id || normalizeText(fixed.word) !== normalizeText(expected.word)) {
    return Object.freeze({
      code: "FIXED_WORD_CONTRADICTION" as const,
      message: `El verso ${slot} contradice la palabra final fijada.`,
      slot,
      expected,
      received: Object.freeze({ ...fixed }),
    });
  }

  if (anchor.forbiddenElements.some((element) => normalizeText(element) === normalizeText(expected.word))) {
    return Object.freeze({
      code: "FIXED_WORD_CONTRADICTION" as const,
      message: `El verso ${slot} prohíbe su propia palabra final fijada.`,
      slot,
      expected,
      received: Object.freeze({ ...fixed }),
    });
  }

  return undefined;
};

const looksLikeVerse = (fragment: string): boolean => {
  const trimmed = fragment.trim();

  if (trimmed.length === 0) {
    return false;
  }

  if (/[.!?]$/u.test(trimmed)) {
    return true;
  }

  return /[\r\n]/u.test(trimmed);
};

const findVerseLikeText = (
  anchor: VerseSemanticAnchorLlmAnchor,
): VerseSemanticAnchorPlanningFailure | undefined => {
  const fields: readonly (readonly [string, string])[] = [
    ["objective", anchor.objective],
    ...anchor.mandatoryElements.map((element) => ["mandatoryElements", element] as const),
    ...anchor.optionalElements.map((element) => ["optionalElements", element] as const),
    ...anchor.forbiddenElements.map((element) => ["forbiddenElements", element] as const),
  ];

  for (const [field, fragment] of fields) {
    if (looksLikeVerse(fragment)) {
      return Object.freeze({
        code: "VERSE_LIKE_TEXT" as const,
        message: `El elemento "${field}" del verso ${anchor.slot} parece un verso completo.`,
        slot: anchor.slot,
        field,
        fragment,
      });
    }
  }

  return undefined;
};

const findContradictoryAnchors = (
  anchors: readonly VerseSemanticAnchorLlmAnchor[],
): readonly string[] => {
  const allMandatory = new Set<string>();

  for (const anchor of anchors) {
    for (const element of anchor.mandatoryElements) {
      allMandatory.add(normalizeText(element));
    }
  }

  const conflicts = new Set<string>();

  for (const anchor of anchors) {
    for (const element of anchor.forbiddenElements) {
      const normalized = normalizeText(element);

      if (allMandatory.has(normalized)) {
        conflicts.add(normalized);
      }
    }
  }

  return Object.freeze([...conflicts]);
};

const hasSharedScene = (output: VerseSemanticAnchorLlmOutput): boolean => {
  if (normalizeText(output.scene).length === 0 || output.sharedReferents.length === 0) {
    return false;
  }

  const verseTexts = output.anchors.map((anchor) =>
    normalizeText([anchor.objective, ...anchor.mandatoryElements, ...anchor.optionalElements].join(" ")),
  );

  return output.sharedReferents.some((referent) => {
    const normalizedReferent = normalizeText(referent);

    if (normalizedReferent.length === 0) {
      return false;
    }

    return verseTexts.filter((text) => text.includes(normalizedReferent)).length >= 2;
  });
};

const validateAnchors = (
  output: VerseSemanticAnchorLlmOutput,
  request: VerseSemanticAnchorPlanningRequest,
): VerseSemanticAnchorPlanningFailure | undefined => {
  const receivedSlots = output.anchors.map((anchor) => anchor.slot);
  const receivedSlotSet = new Set(receivedSlots);
  const missingSlots = expectedSlots.filter((slot) => !receivedSlotSet.has(slot));
  const hasDuplicates = receivedSlots.some((slot, index) => receivedSlots.indexOf(slot) !== index);

  if (missingSlots.length > 0 || hasDuplicates) {
    return Object.freeze({
      code: "MISSING_VERSE_ROLE" as const,
      message: "El plan de anclas debe cubrir exactamente V1, V2, V3 y V4.",
      missingSlots: Object.freeze([...missingSlots]),
      receivedSlots: Object.freeze([...receivedSlots]),
    });
  }

  for (const anchor of output.anchors) {
    const expectedRole = roleBySlot[anchor.slot];

    if (anchor.role !== expectedRole) {
      return Object.freeze({
        code: "INVALID_VERSE_ROLE" as const,
        message: `El verso ${anchor.slot} debe usar el rol ${expectedRole}.`,
        slot: anchor.slot,
        expectedRole,
        receivedRole: anchor.role,
      });
    }
  }

  for (const slot of FIXED_WORD_SLOTS) {
    const anchor = output.anchors.find((candidate) => candidate.slot === slot);
    const contradiction = findFixedWordContradiction(
      anchor,
      fixedWordForSlot(slot, request.fixedFinalWords),
      slot,
    );

    if (contradiction !== undefined) {
      return contradiction;
    }
  }

  for (const anchor of output.anchors) {
    const verseLikeText = findVerseLikeText(anchor);

    if (verseLikeText !== undefined) {
      return verseLikeText;
    }
  }

  const conflicts = findContradictoryAnchors(output.anchors);

  if (conflicts.length > 0) {
    return Object.freeze({
      code: "CONTRADICTORY_ANCHORS" as const,
      message: "Las anclas se contradicen: un elemento prohibido es obligatorio en otro verso.",
      conflicts,
    });
  }

  if (!hasSharedScene(output)) {
    return Object.freeze({
      code: "ISOLATED_IDEAS" as const,
      message: "Las anclas no comparten referentes ni progresión de escena.",
    });
  }

  return undefined;
};

const freezeAnchor = (anchor: VerseSemanticAnchorLlmAnchor): VerseAnchor =>
  Object.freeze({
    slot: anchor.slot,
    role: anchor.role,
    objective: anchor.objective,
    mandatoryElements: Object.freeze([...anchor.mandatoryElements]),
    optionalElements: Object.freeze([...anchor.optionalElements]),
    forbiddenElements: Object.freeze([...anchor.forbiddenElements]),
    ...(anchor.fixedFinalWord === undefined
      ? {}
      : { fixedFinalWord: Object.freeze({ ...anchor.fixedFinalWord }) }),
  });

const freezeAnchorPlan = (
  output: VerseSemanticAnchorLlmOutput,
  provenance: StructuredLlmGenerationProvenance,
  usage: StructuredLlmUsage,
): VerseSemanticAnchorPlan =>
  Object.freeze({
    scene: output.scene,
    sharedReferents: Object.freeze([...output.sharedReferents]),
    anchors: Object.freeze(output.anchors.map(freezeAnchor)),
    warnings: Object.freeze(
      output.warnings.map((warning) => Object.freeze({ kind: warning.kind, detail: warning.detail })),
    ),
    provenance,
    usage,
  });

export async function planVerseSemanticAnchors(
  request: VerseSemanticAnchorPlanningRequest,
  dependencies: VerseSemanticAnchorPlanningDependencies,
): Promise<VerseSemanticAnchorPlanningResult> {
  const generation = await dependencies.planner.generate<VerseSemanticAnchorLlmOutput>({
    operation: "plan-verse-semantic-anchors",
    prompt: ANCHOR_PLANNING_PROMPT,
    input: Object.freeze({
      plan: request.semanticPlan,
      fixedFinalWords: request.fixedFinalWords,
    }),
    outputSchema: anchorOutputSchema,
    limits: ANCHOR_PLANNING_LIMITS,
  });

  if (!generation.ok) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "PLANNER_FAILED" as const,
        message: generation.error.message,
        cause: generation.error,
      }),
    });
  }

  const failure = validateAnchors(generation.value.data, request);

  if (failure !== undefined) {
    return Object.freeze({ ok: false as const, error: failure });
  }

  return Object.freeze({
    ok: true as const,
    value: freezeAnchorPlan(generation.value.data, generation.value.provenance, generation.value.usage),
  });
}

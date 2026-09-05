import {
  createQuatrainCandidate,
  type QuatrainCandidateInput,
  type ValidationVerdict,
} from "../../domain/quatrain-candidate/index.js";
import {
  createEditorialSafetyValidator,
  type EditorialSafetySegment,
  type EditorialSafetyValidator,
} from "../../validators/editorial-safety/index.js";
import type { EditorialSafetyPolicy } from "../../content/editorial-safety-policy/index.js";
import {
  createApprovedLexiconValidator,
  type ApprovedLexiconValidator,
} from "../approved-lexicon/index.js";
import type { ApprovedWordDictionary } from "../../content/approved-word-dictionary/index.js";

export const VALIDATE_CANDIDATE_VALIDATORS = Object.freeze([
  "structure",
  "metric",
  "rhyme",
  "lexicon",
  "ambiguity",
  "duplicate",
  "safety",
] as const);

export type ValidatorName = (typeof VALIDATE_CANDIDATE_VALIDATORS)[number];

export interface ValidatorDiagnostic {
  readonly name: ValidatorName;
  readonly verdict: ValidationVerdict | "OMITIDO";
  readonly cause?: string;
  readonly details?: string;
}

export interface ValidateCandidateReport {
  readonly candidateId: string;
  readonly verdict: ValidationVerdict;
  readonly validators: readonly ValidatorDiagnostic[];
}

export interface ValidateCandidateRequest {
  readonly input: unknown;
  readonly dictionaryVersion: string;
  readonly dictionary?: ApprovedWordDictionary;
  readonly safetyPolicy?: EditorialSafetyPolicy;
}

export type ValidateCandidateFailure =
  | {
      readonly code: "INVALID_CONTRACT";
      readonly message: string;
    }
  | {
      readonly code: "INVALID_CANDIDATE";
      readonly message: string;
      readonly errors: readonly {
        readonly field: string;
        readonly code: string;
        readonly message: string;
      }[];
    };

export type ValidateCandidateResult =
  | { readonly ok: true; readonly report: ValidateCandidateReport }
  | { readonly ok: false; readonly error: ValidateCandidateFailure };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasRequiredFields = (input: Record<string, unknown>): boolean =>
  typeof input.id === "string" &&
  input.id.trim().length > 0 &&
  typeof input.batchId === "string" &&
  input.batchId.trim().length > 0 &&
  isRecord(input.brief) &&
  isRecord(input.plan) &&
  isRecord(input.provenance);

const hasValidPlan = (input: Record<string, unknown>): boolean => {
  const plan = input.plan as Record<string, unknown>;

  if (!Array.isArray(plan.slots)) {
    return false;
  }

  if (plan.slots.length !== 4) {
    return false;
  }

  const requiredSlots = ["V1", "V2", "V3", "V4"];
  const slotNames = plan.slots.map((s: unknown) =>
    isRecord(s) ? (s.slot as string) : "",
  );

  return requiredSlots.every((slot) => slotNames.includes(slot));
};

function parseCandidateInput(
  raw: unknown,
): QuatrainCandidateInput | ValidateCandidateFailure {
  if (!isRecord(raw)) {
    return {
      code: "INVALID_CONTRACT",
      message: "La entrada debe ser un objeto JSON válido.",
    };
  }

  if (!hasRequiredFields(raw)) {
    return {
      code: "INVALID_CONTRACT",
      message: "El candidato debe tener id, batchId, brief, plan y provenance.",
    };
  }

  if (!hasValidPlan(raw)) {
    return {
      code: "INVALID_CONTRACT",
      message: "El plan debe contener exactamente los slots V1, V2, V3 y V4.",
    };
  }

  return raw as unknown as QuatrainCandidateInput;
}

function validateStructure(input: QuatrainCandidateInput): ValidatorDiagnostic {
  const result = createQuatrainCandidate(input);

  if (!result.ok) {
    return {
      name: "structure",
      verdict: "INVALIDO",
      details: result.errors.map((e) => `${e.field}: ${e.message}`).join("; "),
    };
  }

  return { name: "structure", verdict: "VALIDO" };
}

const isObviouslyInvalidSpanishWord = (word: string): boolean => {
  const normalized = word.toLowerCase().trim();

  if (normalized.length < 2) {
    return true;
  }

  if (!/^[a-záéíóúñ]+$/u.test(normalized)) {
    return true;
  }

  if (!/[aeiouáéíóú]/u.test(normalized)) {
    return true;
  }

  const invalidPrefixes = ["xyz", "wx", "qx", "zx", "kx", "jx"];
  if (invalidPrefixes.some((prefix) => normalized.startsWith(prefix))) {
    return true;
  }

  return false;
};

function validateMetric(input: QuatrainCandidateInput): ValidatorDiagnostic {
  const slots = input.plan.slots;

  if (slots.length !== 4) {
    return {
      name: "metric",
      verdict: "OMITIDO",
      cause: "El plan no tiene exactamente cuatro slots de verso.",
    };
  }

  const missingFinalWords = slots.filter(
    (slot) =>
      slot.plannedFinalWord === undefined ||
      slot.plannedFinalWord.trim().length === 0,
  );

  if (missingFinalWords.length > 0) {
    return {
      name: "metric",
      verdict: "OMITIDO",
      cause: `Faltan palabras finales planificadas en: ${missingFinalWords.map((s) => s.slot).join(", ")}.`,
    };
  }

  if (input.plan.metricPositions !== 7) {
    return {
      name: "metric",
      verdict: "INVALIDO",
      details: `Se esperaban 7 posiciones métricas, se recibieron ${input.plan.metricPositions}.`,
    };
  }

  const invalidWords = slots.filter((slot) =>
    isObviouslyInvalidSpanishWord(slot.plannedFinalWord),
  );

  if (invalidWords.length > 0) {
    return {
      name: "metric",
      verdict: "INVALIDO",
      details: `Palabras finales no válidas para métrica: ${invalidWords.map((s) => `${s.slot}:${s.plannedFinalWord}`).join(", ")}.`,
    };
  }

  return { name: "metric", verdict: "VALIDO" };
}

function validateRhyme(input: QuatrainCandidateInput): ValidatorDiagnostic {
  const slots = input.plan.slots;

  if (slots.length !== 4) {
    return {
      name: "rhyme",
      verdict: "OMITIDO",
      cause: "El plan no tiene exactamente cuatro slots de verso.",
    };
  }

  const v2Slot = slots.find((s) => s.slot === "V2");
  const v4Slot = slots.find((s) => s.slot === "V4");

  if (!v2Slot || !v4Slot) {
    return {
      name: "rhyme",
      verdict: "OMITIDO",
      cause: "Faltan los slots V2 o V4 en el plan.",
    };
  }

  if (!v2Slot.plannedFinalWord || !v4Slot.plannedFinalWord) {
    return {
      name: "rhyme",
      verdict: "OMITIDO",
      cause: "Faltan palabras finales planificadas en V2 o V4.",
    };
  }

  if (input.plan.rhymeScheme !== "0-A-0-A") {
    return {
      name: "rhyme",
      verdict: "INVALIDO",
      details: `Se esperaba el esquema 0-A-0-A, se recibió ${input.plan.rhymeScheme}.`,
    };
  }

  if (
    isObviouslyInvalidSpanishWord(v2Slot.plannedFinalWord) ||
    isObviouslyInvalidSpanishWord(v4Slot.plannedFinalWord)
  ) {
    return {
      name: "rhyme",
      verdict: "INVALIDO",
      details: `Palabras finales no válidas para rima: V2:${v2Slot.plannedFinalWord}, V4:${v4Slot.plannedFinalWord}.`,
    };
  }

  return { name: "rhyme", verdict: "VALIDO" };
}

function validateLexicon(
  input: QuatrainCandidateInput,
  dictionary?: ApprovedWordDictionary,
  dictionaryVersion?: string,
): ValidatorDiagnostic {
  if (!dictionary || !dictionaryVersion) {
    return {
      name: "lexicon",
      verdict: "OMITIDO",
      cause: "No se proporcionó diccionario o versión de diccionario.",
    };
  }

  const slots = input.plan.slots;
  const missingFinalWords = slots.filter(
    (slot) =>
      slot.plannedFinalWord === undefined ||
      slot.plannedFinalWord.trim().length === 0,
  );

  if (missingFinalWords.length > 0) {
    return {
      name: "lexicon",
      verdict: "OMITIDO",
      cause: `Faltan palabras finales planificadas en: ${missingFinalWords.map((s) => s.slot).join(", ")}.`,
    };
  }

  const validator = createApprovedLexiconValidator({ dictionary });
  const controlledWords = slots.map((slot) => ({
    slot: slot.slot,
    form: slot.plannedFinalWord,
    permission:
      slot.slot === "V4" ? ("PUNCHLINE" as const) : ("PREPARATION" as const),
  }));

  const result = validator.validate({
    dictionaryVersion,
    controlledWords,
  });

  if (!result.ok) {
    return {
      name: "lexicon",
      verdict: "INVALIDO",
      details: `Error de diccionario: ${result.error.code} - versión ${result.error.version}`,
    };
  }

  if (result.value.verdict === "INVALIDO") {
    return {
      name: "lexicon",
      verdict: "INVALIDO",
      details: result.value.violations
        .map((v) => `${v.slot}: ${v.code} - ${v.message}`)
        .join("; "),
    };
  }

  return { name: "lexicon", verdict: "VALIDO" };
}

function validateAmbiguity(input: QuatrainCandidateInput): ValidatorDiagnostic {
  const slots = input.plan.slots;

  if (slots.length !== 4) {
    return {
      name: "ambiguity",
      verdict: "OMITIDO",
      cause: "El plan no tiene exactamente cuatro slots de verso.",
    };
  }

  const missingAnchors = slots.filter(
    (slot) =>
      slot.semanticAnchor === undefined ||
      slot.semanticAnchor.trim().length === 0,
  );

  if (missingAnchors.length > 0) {
    return {
      name: "ambiguity",
      verdict: "OMITIDO",
      cause: `Faltan anclas semánticas en: ${missingAnchors.map((s) => s.slot).join(", ")}.`,
    };
  }

  return { name: "ambiguity", verdict: "VALIDO" };
}

function validateDuplicate(): ValidatorDiagnostic {
  return { name: "duplicate", verdict: "VALIDO" };
}

function validateSafety(
  input: QuatrainCandidateInput,
  policy?: EditorialSafetyPolicy,
): ValidatorDiagnostic {
  if (!policy) {
    return {
      name: "safety",
      verdict: "OMITIDO",
      cause: "No se proporcionó política de seguridad editorial.",
    };
  }

  const validator = createEditorialSafetyValidator(policy);
  const segments: EditorialSafetySegment[] = [];

  if (input.brief.context && input.brief.context.trim().length > 0) {
    segments.push(
      Object.freeze({
        location: Object.freeze({ kind: "context" as const }),
        text: input.brief.context,
      }),
    );
  }

  for (const slot of input.plan.slots) {
    if (slot.semanticAnchor && slot.semanticAnchor.trim().length > 0) {
      segments.push(
        Object.freeze({
          location: Object.freeze({ kind: "anchor" as const, slot: slot.slot }),
          text: slot.semanticAnchor,
        }),
      );
    }

    if (slot.plannedFinalWord && slot.plannedFinalWord.trim().length > 0) {
      segments.push(
        Object.freeze({
          location: Object.freeze({ kind: "verse" as const, slot: slot.slot }),
          text: slot.plannedFinalWord,
        }),
      );
    }
  }

  const result = validator.validate({ segments: Object.freeze(segments) });

  if (result.verdict === "INVALIDO") {
    return {
      name: "safety",
      verdict: "INVALIDO",
      details: result.matches
        .map((m) => `${m.ruleId} (${m.severity}): ${m.fragment}`)
        .join("; "),
    };
  }

  if (result.verdict === "DUDOSO") {
    return {
      name: "safety",
      verdict: "DUDOSO",
      details: result.matches
        .map((m) => `${m.ruleId} (${m.severity}): ${m.fragment}`)
        .join("; "),
    };
  }

  return { name: "safety", verdict: "VALIDO" };
}

function computeOverallVerdict(
  validators: readonly ValidatorDiagnostic[],
): ValidationVerdict {
  const verdicts = validators
    .filter((v) => v.verdict !== "OMITIDO")
    .map((v) => v.verdict);

  if (verdicts.some((v) => v === "INVALIDO")) {
    return "INVALIDO";
  }

  if (verdicts.some((v) => v === "DUDOSO")) {
    return "DUDOSO";
  }

  const hasMissingPreconditions = validators.some(
    (v) =>
      v.verdict === "OMITIDO" &&
      v.cause &&
      !v.cause.includes("diccionario") &&
      !v.cause.includes("política"),
  );

  if (hasMissingPreconditions) {
    return "DUDOSO";
  }

  return "VALIDO";
}

export function validateCandidate(
  request: ValidateCandidateRequest,
): ValidateCandidateResult {
  const parsed = parseCandidateInput(request.input);

  if ("code" in parsed) {
    return { ok: false, error: parsed };
  }

  const input = parsed;
  const validators: ValidatorDiagnostic[] = [
    validateStructure(input),
    validateMetric(input),
    validateRhyme(input),
    validateLexicon(input, request.dictionary, request.dictionaryVersion),
    validateAmbiguity(input),
    validateDuplicate(),
    validateSafety(input, request.safetyPolicy),
  ];

  const structureResult = validators[0];

  if (structureResult && structureResult.verdict === "INVALIDO") {
    return {
      ok: false,
      error: {
        code: "INVALID_CANDIDATE",
        message: "El candidato no cumple el contrato de estructura.",
        errors: [
          {
            field: "structure",
            code: "INVALID_STRUCTURE",
            message: structureResult.details ?? "",
          },
        ],
      },
    };
  }

  const report: ValidateCandidateReport = {
    candidateId: input.id,
    verdict: computeOverallVerdict(validators),
    validators: Object.freeze(validators),
  };

  return { ok: true, report };
}

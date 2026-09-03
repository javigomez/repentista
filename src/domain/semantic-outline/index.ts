import type { GenerationBrief } from "../generation-brief/index.js";

export interface SemanticOutlineVerseFunctions {
  readonly v1: string;
  readonly v2: string;
  readonly v3: string;
  readonly v4: string;
}

export interface SemanticOutlineOutputDto {
  readonly centralIdea: string;
  readonly scene: string;
  readonly comicDevice: string;
  readonly turn: string;
  readonly finalIntention: string;
  readonly verseFunctions: SemanticOutlineVerseFunctions;
  readonly risks: readonly string[];
  readonly warnings: readonly string[];
}

export interface SemanticOutlineProvenance {
  readonly provider: string;
  readonly model: string;
  readonly prompt: {
    readonly id: string;
    readonly version: string;
  };
}

export interface SemanticOutline extends SemanticOutlineOutputDto {
  readonly brief: GenerationBrief;
  readonly provenance: SemanticOutlineProvenance;
}

export type SemanticOutlineViolationCode =
  | "REQUIRED_FIELD"
  | "INVALID_FIELD"
  | "EMPTY_FIELD"
  | "FIELD_TOO_LONG"
  | "FORBIDDEN_STAGE_FIELD";

export interface SemanticOutlineViolation {
  readonly path: string;
  readonly code: SemanticOutlineViolationCode;
  readonly message: string;
}

export type SemanticOutlineOutputValidationResult =
  | { readonly ok: true; readonly value: SemanticOutlineOutputDto }
  | { readonly ok: false; readonly violations: readonly SemanticOutlineViolation[] };

export type SemanticOutlineCreationResult =
  | { readonly ok: true; readonly value: SemanticOutline }
  | { readonly ok: false; readonly violations: readonly SemanticOutlineViolation[] };

interface CreateSemanticOutlineInput {
  readonly brief: GenerationBrief;
  readonly output: unknown;
  readonly provenance: SemanticOutlineProvenance;
}

type RecordValue = Record<string, unknown>;

const rootTextFields = Object.freeze([
  "centralIdea",
  "scene",
  "comicDevice",
  "turn",
  "finalIntention",
] as const);

const verseFunctionFields = Object.freeze(["v1", "v2", "v3", "v4"] as const);
const arrayFields = Object.freeze(["risks", "warnings"] as const);

const allowedRootFields = new Set<string>([
  ...rootTextFields,
  "verseFunctions",
  ...arrayFields,
]);

const forbiddenStageFields = Object.freeze([
  "verses",
  "rhymeWords",
  "finalWords",
  "finalWord",
  "rhymeWord",
  "v2RhymeWord",
  "v4FinalWord",
] as const);

const maximumTextLength = 400;
const maximumListItemLength = 240;
const maximumListItems = 12;

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasOwn = (record: RecordValue, field: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, field);

const normalizeText = (value: string): string => value.trim().replace(/\s+/gu, " ");

const violation = (
  path: string,
  code: SemanticOutlineViolationCode,
  message: string,
): SemanticOutlineViolation => Object.freeze({ path, code, message });

const requiredField = (path: string): SemanticOutlineViolation =>
  violation(path, "REQUIRED_FIELD", `${path} es obligatorio.`);

const invalidField = (path: string, expected: string): SemanticOutlineViolation =>
  violation(path, "INVALID_FIELD", `${path} debe ser ${expected}.`);

const forbiddenStageField = (path: string): SemanticOutlineViolation =>
  violation(path, "FORBIDDEN_STAGE_FIELD", `${path} no pertenece a la planificacion semantica.`);

const validateTextField = (
  record: RecordValue,
  field: string,
  path: string,
  violations: SemanticOutlineViolation[],
): string | undefined => {
  if (!hasOwn(record, field) || record[field] === undefined || record[field] === null) {
    violations.push(requiredField(path));
    return undefined;
  }

  const value = record[field];

  if (typeof value !== "string") {
    violations.push(invalidField(path, "texto"));
    return undefined;
  }

  const normalized = normalizeText(value);

  if (normalized.length === 0) {
    violations.push(violation(path, "EMPTY_FIELD", `${path} no puede estar vacio.`));
    return undefined;
  }

  if (normalized.length > maximumTextLength) {
    violations.push(
      violation(path, "FIELD_TOO_LONG", `${path} debe tener ${maximumTextLength} caracteres o menos.`),
    );
    return undefined;
  }

  return normalized;
};

const validateTextArrayField = (
  record: RecordValue,
  path: string,
  violations: SemanticOutlineViolation[],
): readonly string[] | undefined => {
  if (!hasOwn(record, path) || record[path] === undefined || record[path] === null) {
    violations.push(requiredField(path));
    return undefined;
  }

  const value = record[path];

  if (!Array.isArray(value)) {
    violations.push(invalidField(path, "una lista de textos"));
    return undefined;
  }

  if (value.length > maximumListItems) {
    violations.push(
      violation(path, "FIELD_TOO_LONG", `${path} debe tener ${maximumListItems} elementos o menos.`),
    );
    return undefined;
  }

  const normalizedValues: string[] = [];

  for (const [index, item] of value.entries()) {
    const itemPath = `${path}.${index}`;

    if (typeof item !== "string") {
      violations.push(invalidField(itemPath, "texto"));
      continue;
    }

    const normalized = normalizeText(item);

    if (normalized.length === 0) {
      violations.push(violation(itemPath, "EMPTY_FIELD", `${itemPath} no puede estar vacio.`));
      continue;
    }

    if (normalized.length > maximumListItemLength) {
      violations.push(
        violation(
          itemPath,
          "FIELD_TOO_LONG",
          `${itemPath} debe tener ${maximumListItemLength} caracteres o menos.`,
        ),
      );
      continue;
    }

    normalizedValues.push(normalized);
  }

  return Object.freeze(normalizedValues);
};

const validateVerseFunctions = (
  record: RecordValue,
  violations: SemanticOutlineViolation[],
): SemanticOutlineVerseFunctions | undefined => {
  const path = "verseFunctions";

  if (!hasOwn(record, path) || record[path] === undefined || record[path] === null) {
    violations.push(requiredField(path));
    return undefined;
  }

  const value = record[path];

  if (!isRecord(value)) {
    violations.push(invalidField(path, "un objeto con funciones para V1-V4"));
    return undefined;
  }

  const normalizedFunctions: Partial<Record<keyof SemanticOutlineVerseFunctions, string>> = {};

  for (const field of verseFunctionFields) {
    const normalized = validateTextField(value, field, `${path}.${field}`, violations);

    if (normalized !== undefined) {
      normalizedFunctions[field] = normalized;
    }
  }

  if (verseFunctionFields.some((field) => normalizedFunctions[field] === undefined)) {
    return undefined;
  }

  return Object.freeze({
    v1: normalizedFunctions.v1,
    v2: normalizedFunctions.v2,
    v3: normalizedFunctions.v3,
    v4: normalizedFunctions.v4,
  }) as SemanticOutlineVerseFunctions;
};

const isForbiddenStageField = (field: string): boolean =>
  forbiddenStageFields.some((forbiddenField) => forbiddenField === field);

export function validateSemanticOutlineOutput(output: unknown): SemanticOutlineOutputValidationResult {
  const violations: SemanticOutlineViolation[] = [];

  if (!isRecord(output)) {
    return Object.freeze({
      ok: false as const,
      violations: Object.freeze([invalidField("outline", "un objeto")]),
    });
  }

  for (const field of forbiddenStageFields) {
    if (hasOwn(output, field) && output[field] !== undefined) {
      violations.push(forbiddenStageField(field));
    }
  }

  for (const field of Object.keys(output)) {
    if (!allowedRootFields.has(field) && !isForbiddenStageField(field)) {
      violations.push(invalidField(field, "un campo del esquema de planificacion semantica"));
    }
  }

  const centralIdea = validateTextField(output, "centralIdea", "centralIdea", violations);
  const scene = validateTextField(output, "scene", "scene", violations);
  const comicDevice = validateTextField(output, "comicDevice", "comicDevice", violations);
  const turn = validateTextField(output, "turn", "turn", violations);
  const finalIntention = validateTextField(output, "finalIntention", "finalIntention", violations);
  const verseFunctions = validateVerseFunctions(output, violations);
  const risks = validateTextArrayField(output, "risks", violations);
  const warnings = validateTextArrayField(output, "warnings", violations);

  if (
    violations.length > 0 ||
    centralIdea === undefined ||
    scene === undefined ||
    comicDevice === undefined ||
    turn === undefined ||
    finalIntention === undefined ||
    verseFunctions === undefined ||
    risks === undefined ||
    warnings === undefined
  ) {
    return Object.freeze({ ok: false as const, violations: Object.freeze(violations) });
  }

  return Object.freeze({
    ok: true as const,
    value: Object.freeze({
      centralIdea,
      scene,
      comicDevice,
      turn,
      finalIntention,
      verseFunctions,
      risks,
      warnings,
    }),
  });
}

export function createSemanticOutline(input: CreateSemanticOutlineInput): SemanticOutlineCreationResult {
  const validation = validateSemanticOutlineOutput(input.output);

  if (!validation.ok) {
    return validation;
  }

  return Object.freeze({
    ok: true as const,
    value: Object.freeze({
      brief: input.brief,
      ...validation.value,
      provenance: input.provenance,
    }),
  });
}

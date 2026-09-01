export const EDITORIAL_SAFETY_RULE_SEVERITIES = ["BLOQUEANTE", "DUDOSO"] as const;
export const EDITORIAL_SAFETY_RULE_MODES = ["ANY", "ALL"] as const;

export type EditorialSafetyRuleSeverity = (typeof EDITORIAL_SAFETY_RULE_SEVERITIES)[number];
export type EditorialSafetyRuleMode = (typeof EDITORIAL_SAFETY_RULE_MODES)[number];

export interface EditorialSafetyRuleInput {
  readonly id: string;
  readonly category: string;
  readonly severity: EditorialSafetyRuleSeverity;
  readonly mode: EditorialSafetyRuleMode;
  readonly terms: readonly string[];
}

export interface EditorialSafetyRule {
  readonly id: string;
  readonly category: string;
  readonly severity: EditorialSafetyRuleSeverity;
  readonly mode: EditorialSafetyRuleMode;
  readonly terms: readonly string[];
}

export interface EditorialSafetyPolicyInput {
  readonly version: string;
  readonly audience: string;
  readonly rules: readonly EditorialSafetyRuleInput[];
}

export interface EditorialSafetyPolicy {
  readonly version: string;
  readonly audience: string;
  readonly rules: readonly EditorialSafetyRule[];
}

export interface EditorialSafetyPolicyFieldError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

export type EditorialSafetyPolicyCreationResult =
  | { readonly ok: true; readonly value: EditorialSafetyPolicy }
  | { readonly ok: false; readonly errors: readonly EditorialSafetyPolicyFieldError[] };

export class EditorialSafetyPolicyCreationError extends Error {
  readonly errors: readonly EditorialSafetyPolicyFieldError[];

  constructor(errors: readonly EditorialSafetyPolicyFieldError[]) {
    super("Editorial safety policy could not be created.");
    this.name = "EditorialSafetyPolicyCreationError";
    this.errors = Object.freeze(errors.map((error) => Object.freeze(error)));
  }
}

const collapseWhitespace = (value: string): string => value.trim().replace(/\s+/gu, " ");

const stripMatchingAccents = (value: string): string => {
  const protectedEnye = value.replace(/ñ/gu, "\uE000");

  return protectedEnye
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\uE000/gu, "ñ");
};

export const normalizeEditorialSafetyTerm = (value: string): string =>
  stripMatchingAccents(collapseWhitespace(value).toLocaleLowerCase("es"));

const fieldError = (
  field: string,
  code: string,
  message: string,
): EditorialSafetyPolicyFieldError => Object.freeze({ field, code, message });

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && collapseWhitespace(value).length > 0;

const hasSupportedValue = <T extends string>(
  values: readonly T[],
  value: string,
): value is T => values.includes(value as T);

const normalizeRule = (
  rule: EditorialSafetyRuleInput,
  index: number,
): { readonly rule?: EditorialSafetyRule; readonly error?: EditorialSafetyPolicyFieldError } => {
  const prefix = `rules[${index}]`;
  const id = collapseWhitespace(rule.id);
  const category = collapseWhitespace(rule.category);
  const severity = collapseWhitespace(rule.severity);
  const mode = collapseWhitespace(rule.mode);

  if (!isNonEmptyString(rule.id)) {
    return { error: fieldError(`${prefix}.id`, "REQUIRED", "El identificador de regla es obligatorio.") };
  }

  if (!isNonEmptyString(rule.category)) {
    return { error: fieldError(`${prefix}.category`, "REQUIRED", "La categoría de regla es obligatoria.") };
  }

  if (!hasSupportedValue(EDITORIAL_SAFETY_RULE_SEVERITIES, severity)) {
    return {
      error: fieldError(
        `${prefix}.severity`,
        "UNSUPPORTED_SEVERITY",
        "La severidad debe ser BLOQUEANTE o DUDOSO.",
      ),
    };
  }

  if (!hasSupportedValue(EDITORIAL_SAFETY_RULE_MODES, mode)) {
    return {
      error: fieldError(`${prefix}.mode`, "UNSUPPORTED_MODE", "El modo debe ser ANY o ALL."),
    };
  }

  if (!Array.isArray(rule.terms) || rule.terms.length === 0) {
    return { error: fieldError(`${prefix}.terms`, "EMPTY_TERMS", "La regla debe declarar al menos un término.") };
  }

  const terms = rule.terms.map((term) => (isNonEmptyString(term) ? collapseWhitespace(term) : undefined));

  if (terms.some((term) => term === undefined)) {
    return {
      error: fieldError(
        `${prefix}.terms`,
        "INVALID_TERM",
        "Cada término de regla debe ser texto no vacío.",
      ),
    };
  }

  return {
    rule: Object.freeze({
      id,
      category,
      severity: severity as EditorialSafetyRuleSeverity,
      mode: mode as EditorialSafetyRuleMode,
      terms: Object.freeze([...new Set(terms as string[])]),
    }),
  };
};

export function createEditorialSafetyPolicy(
  input: EditorialSafetyPolicyInput,
): EditorialSafetyPolicyCreationResult {
  const errors: EditorialSafetyPolicyFieldError[] = [];
  const version = collapseWhitespace(input.version);
  const audience = collapseWhitespace(input.audience);

  if (!isNonEmptyString(input.version)) {
    errors.push(fieldError("version", "REQUIRED", "La versión de política es obligatoria."));
  }

  if (!isNonEmptyString(input.audience)) {
    errors.push(fieldError("audience", "REQUIRED", "La audiencia de la política es obligatoria."));
  }

  if (!Array.isArray(input.rules) || input.rules.length === 0) {
    errors.push(fieldError("rules", "EMPTY_RULES", "La política debe declarar al menos una regla."));
  }

  const rules: EditorialSafetyRule[] = [];
  const seenIds = new Set<string>();

  (input.rules ?? []).forEach((rule, index) => {
    const normalized = normalizeRule(rule, index);

    if (normalized.error !== undefined) {
      errors.push(normalized.error);
      return;
    }

    const resolved = normalized.rule as EditorialSafetyRule;

    if (seenIds.has(resolved.id)) {
      errors.push(
        fieldError(
          `rules[${index}].id`,
          "DUPLICATE_RULE_ID",
          "El identificador de regla debe ser único.",
        ),
      );
      return;
    }

    seenIds.add(resolved.id);
    rules.push(resolved);
  });

  if (errors.length > 0) {
    return Object.freeze({ ok: false as const, errors: Object.freeze(errors) });
  }

  const value: EditorialSafetyPolicy = Object.freeze({
    version,
    audience,
    rules: Object.freeze(rules),
  });

  return Object.freeze({ ok: true as const, value });
}

/** Initial editorial policy for the 10-12 audience. Versioned and expanded by editorial review. */
export const EDITORIAL_SAFETY_POLICY_V1_INPUT: EditorialSafetyPolicyInput = Object.freeze({
  version: "editorial-safety-policy/v1",
  audience: "10-12",
  rules: Object.freeze([
    Object.freeze({
      id: "discriminacion",
      category: "discriminacion",
      severity: "BLOQUEANTE",
      mode: "ANY",
      terms: Object.freeze(["maricón", "subnormal", "retrasado"]),
    }),
    Object.freeze({
      id: "contenido-sexual",
      category: "contenido-sexual",
      severity: "BLOQUEANTE",
      mode: "ANY",
      terms: Object.freeze(["pornografía", "sexo", "desnudo"]),
    }),
    Object.freeze({
      id: "violencia-explicita",
      category: "violencia-explicita",
      severity: "BLOQUEANTE",
      mode: "ANY",
      terms: Object.freeze(["asesinar", "apuñalar", "degollar"]),
    }),
    Object.freeze({
      id: "sustancias",
      category: "sustancias",
      severity: "BLOQUEANTE",
      mode: "ANY",
      terms: Object.freeze(["cocaína", "heroína"]),
    }),
    Object.freeze({
      id: "maltrato-animal",
      category: "maltrato-animal",
      severity: "BLOQUEANTE",
      mode: "ALL",
      terms: Object.freeze(["pegar", "perro"]),
    }),
    Object.freeze({
      id: "armas-contextuales",
      category: "armas-contextuales",
      severity: "DUDOSO",
      mode: "ANY",
      terms: Object.freeze(["pistola", "cuchillo", "bomba"]),
    }),
    Object.freeze({
      id: "estado-alterado",
      category: "estado-alterado",
      severity: "DUDOSO",
      mode: "ANY",
      terms: Object.freeze(["borracho", "matar", "morir"]),
    }),
  ]),
});

export function createInitialEditorialSafetyPolicy(): EditorialSafetyPolicy {
  const result = createEditorialSafetyPolicy(EDITORIAL_SAFETY_POLICY_V1_INPUT);

  if (!result.ok) {
    throw new EditorialSafetyPolicyCreationError(result.errors);
  }

  return result.value;
}

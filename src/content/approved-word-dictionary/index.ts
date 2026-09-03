const SUPPORTED_TONICITIES = ["aguda", "llana"] as const;
const SUPPORTED_STATUSES = ["approved", "pending"] as const;

export type ApprovedWordTonicity = (typeof SUPPORTED_TONICITIES)[number];
export type ApprovedWordStatus = (typeof SUPPORTED_STATUSES)[number];

export interface ApprovedWordInput {
  readonly version: string;
  readonly form: string;
  readonly lemma: string;
  readonly tonicity: string;
  readonly category: string;
  readonly level: string;
  readonly status: string;
  readonly allowedAsPreparation: boolean;
  readonly allowedAsPunchline: boolean;
}

export interface ApprovedWord {
  readonly version: string;
  readonly form: string;
  readonly normalizedForm: string;
  readonly lemma: string;
  readonly normalizedLemma: string;
  readonly tonicity: ApprovedWordTonicity;
  readonly category: string;
  readonly level: string;
  readonly status: ApprovedWordStatus;
  readonly allowedAsPreparation: boolean;
  readonly allowedAsPunchline: boolean;
}

export interface ApprovedWordFieldError {
  readonly field: string;
  readonly code: string;
  readonly message: string;
}

export type ApprovedWordCreationResult =
  | { readonly ok: true; readonly value: ApprovedWord }
  | { readonly ok: false; readonly errors: readonly ApprovedWordFieldError[] };

export interface ApprovedWordDictionaryInput {
  readonly versions: Readonly<Record<string, readonly ApprovedWordInput[]>>;
}

export interface ApprovedWordLookupRequest {
  readonly version: string;
  readonly form: string;
}

export type ApprovedWordLookupResult =
  | {
      readonly ok: true;
      readonly status: "approved" | "pending";
      readonly entry: ApprovedWord;
    }
  | {
      readonly ok: true;
      readonly status: "missing";
      readonly version: string;
      readonly normalizedForm: string;
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: "DICTIONARY_VERSION_UNAVAILABLE";
        readonly version: string;
        readonly availableVersions: readonly string[];
      };
    };

export interface ApprovedWordVersionRequest {
  readonly version: string;
}

export type ApprovedWordVersionResult =
  | {
      readonly ok: true;
      readonly entries: readonly ApprovedWord[];
    }
  | {
      readonly ok: false;
      readonly error: {
        readonly code: "DICTIONARY_VERSION_UNAVAILABLE";
        readonly version: string;
        readonly availableVersions: readonly string[];
      };
    };

export interface ApprovedWordDictionary {
  findByForm(request: ApprovedWordLookupRequest): ApprovedWordLookupResult;
  findAllByVersion(
    request: ApprovedWordVersionRequest,
  ): ApprovedWordVersionResult;
}

export class ApprovedWordDictionaryCreationError extends Error {
  readonly errors: readonly ApprovedWordFieldError[];

  constructor(errors: readonly ApprovedWordFieldError[]) {
    super("Approved word dictionary could not be created.");
    this.name = "ApprovedWordDictionaryCreationError";
    this.errors = freezeErrors(errors);
  }
}

const collapseWhitespace = (value: string): string =>
  value.trim().replace(/\s+/gu, " ");

const normalizeVisibleText = (value: string): string =>
  collapseWhitespace(value).toLocaleLowerCase("es");

const stripLookupAccents = (value: string): string => {
  const protectedEnye = value.replace(/ñ/gu, "\uE000");

  return protectedEnye
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\uE000/gu, "ñ");
};

export const normalizeApprovedWordForm = (value: string): string =>
  stripLookupAccents(normalizeVisibleText(value));

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && collapseWhitespace(value).length > 0;

const fieldError = (
  field: string,
  code: string,
  message: string,
): ApprovedWordFieldError => Object.freeze({ field, code, message });

const freezeErrors = (
  errors: readonly ApprovedWordFieldError[],
): readonly ApprovedWordFieldError[] =>
  Object.freeze(errors.map((error) => Object.freeze(error)));

const fail = (
  errors: readonly ApprovedWordFieldError[],
): ApprovedWordCreationResult =>
  Object.freeze({ ok: false as const, errors: freezeErrors(errors) });

const hasSupportedValue = <T extends string>(
  values: readonly T[],
  value: string,
): value is T => values.includes(value as T);

const validateRequiredText = (
  input: unknown,
  field: keyof ApprovedWordInput,
  errors: ApprovedWordFieldError[],
): string => {
  if (!isNonEmptyString(input)) {
    errors.push(fieldError(field, "REQUIRED", `${field} es obligatorio.`));
    return "";
  }

  return collapseWhitespace(input);
};

const validateBoolean = (
  input: unknown,
  field: keyof ApprovedWordInput,
  errors: ApprovedWordFieldError[],
): boolean => {
  if (typeof input !== "boolean") {
    errors.push(
      fieldError(field, "INVALID_BOOLEAN", `${field} debe ser booleano.`),
    );
    return false;
  }

  return input;
};

export function createApprovedWord(
  input: ApprovedWordInput,
): ApprovedWordCreationResult {
  const errors: ApprovedWordFieldError[] = [];
  const version = validateRequiredText(input.version, "version", errors);
  const form = normalizeVisibleText(
    validateRequiredText(input.form, "form", errors),
  );
  const lemma = normalizeVisibleText(
    validateRequiredText(input.lemma, "lemma", errors),
  );
  const category = normalizeVisibleText(
    validateRequiredText(input.category, "category", errors),
  );
  const level = normalizeVisibleText(
    validateRequiredText(input.level, "level", errors),
  );
  const tonicity = normalizeVisibleText(
    validateRequiredText(input.tonicity, "tonicity", errors),
  );
  const status = normalizeVisibleText(
    validateRequiredText(input.status, "status", errors),
  );
  const allowedAsPreparation = validateBoolean(
    input.allowedAsPreparation,
    "allowedAsPreparation",
    errors,
  );
  const allowedAsPunchline = validateBoolean(
    input.allowedAsPunchline,
    "allowedAsPunchline",
    errors,
  );

  if (
    tonicity.length > 0 &&
    !hasSupportedValue(SUPPORTED_TONICITIES, tonicity)
  ) {
    errors.push(
      fieldError(
        "tonicity",
        "UNSUPPORTED_TONICITY",
        "Solo se admite tonicidad aguda o llana.",
      ),
    );
  }

  if (status.length > 0 && !hasSupportedValue(SUPPORTED_STATUSES, status)) {
    errors.push(
      fieldError(
        "status",
        "UNSUPPORTED_STATUS",
        "Solo se admite estado approved o pending.",
      ),
    );
  }

  const normalizedForm = normalizeApprovedWordForm(form);
  const normalizedLemma = normalizeApprovedWordForm(lemma);

  if (normalizedForm.length === 0 && form.length > 0) {
    errors.push(
      fieldError(
        "form",
        "INVALID_NORMALIZED_FORM",
        "La forma normalizada no puede estar vacía.",
      ),
    );
  }

  if (normalizedLemma.length === 0 && lemma.length > 0) {
    errors.push(
      fieldError(
        "lemma",
        "INVALID_NORMALIZED_LEMMA",
        "El lema normalizado no puede estar vacío.",
      ),
    );
  }

  if (errors.length > 0) {
    return fail(errors);
  }

  const value: ApprovedWord = Object.freeze({
    version,
    form,
    normalizedForm,
    lemma,
    normalizedLemma,
    tonicity: tonicity as ApprovedWordTonicity,
    category,
    level,
    status: status as ApprovedWordStatus,
    allowedAsPreparation,
    allowedAsPunchline,
  });

  return Object.freeze({ ok: true as const, value });
}

const prefixErrors = (
  prefix: string,
  errors: readonly ApprovedWordFieldError[],
): ApprovedWordFieldError[] =>
  errors.map((error) =>
    fieldError(`${prefix}.${error.field}`, error.code, error.message),
  );

export function createInMemoryApprovedWordDictionary(
  input: ApprovedWordDictionaryInput,
): ApprovedWordDictionary {
  const errors: ApprovedWordFieldError[] = [];
  const versions = new Map<string, ReadonlyMap<string, ApprovedWord>>();
  const versionNames = Object.keys(input.versions)
    .map(collapseWhitespace)
    .sort();

  for (const [rawVersion, entries] of Object.entries(input.versions)) {
    const version = collapseWhitespace(rawVersion);
    const byNormalizedForm = new Map<string, ApprovedWord>();

    if (version.length === 0) {
      errors.push(
        fieldError(
          "versions",
          "REQUIRED_VERSION",
          "La versión del diccionario es obligatoria.",
        ),
      );
      continue;
    }

    entries.forEach((entryInput, index) => {
      const result = createApprovedWord(entryInput);
      const prefix = `versions.${version}[${index}]`;

      if (!result.ok) {
        errors.push(...prefixErrors(prefix, result.errors));
        return;
      }

      if (result.value.version !== version) {
        errors.push(
          fieldError(
            `${prefix}.version`,
            "VERSION_MISMATCH",
            "La versión de la entrada debe coincidir con la versión del snapshot.",
          ),
        );
        return;
      }

      if (byNormalizedForm.has(result.value.normalizedForm)) {
        errors.push(
          fieldError(
            `${prefix}.form`,
            "DUPLICATE_FORM",
            "La forma normalizada ya existe en esta versión del diccionario.",
          ),
        );
        return;
      }

      byNormalizedForm.set(result.value.normalizedForm, result.value);
    });

    versions.set(version, byNormalizedForm);
  }

  if (errors.length > 0) {
    throw new ApprovedWordDictionaryCreationError(errors);
  }

  const availableVersions = Object.freeze(versionNames);

  return Object.freeze({
    findByForm(request: ApprovedWordLookupRequest): ApprovedWordLookupResult {
      const version = collapseWhitespace(request.version);
      const snapshot = versions.get(version);

      if (snapshot === undefined) {
        return Object.freeze({
          ok: false as const,
          error: Object.freeze({
            code: "DICTIONARY_VERSION_UNAVAILABLE" as const,
            version,
            availableVersions,
          }),
        });
      }

      const normalizedForm = normalizeApprovedWordForm(request.form);
      const entry = snapshot.get(normalizedForm);

      if (entry === undefined) {
        return Object.freeze({
          ok: true as const,
          status: "missing" as const,
          version,
          normalizedForm,
        });
      }

      return Object.freeze({
        ok: true as const,
        status: entry.status,
        entry,
      });
    },

    findAllByVersion(
      request: ApprovedWordVersionRequest,
    ): ApprovedWordVersionResult {
      const version = collapseWhitespace(request.version);
      const snapshot = versions.get(version);

      if (snapshot === undefined) {
        return Object.freeze({
          ok: false as const,
          error: Object.freeze({
            code: "DICTIONARY_VERSION_UNAVAILABLE" as const,
            version,
            availableVersions,
          }),
        });
      }

      return Object.freeze({
        ok: true as const,
        entries: Object.freeze([...snapshot.values()]),
      });
    },
  });
}

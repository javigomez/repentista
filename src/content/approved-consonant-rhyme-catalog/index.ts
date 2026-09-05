export const INITIAL_CONSONANT_RHYME_DIALECT_POLICY = Object.freeze({
  version: "spanish-consonant-rhyme/v1",
  description:
    "Normalize editorial phonetic rhyme tails by case, accents, whitespace and optional leading hyphen.",
} as const);

export type ConsonantRhymeDialectPolicy = typeof INITIAL_CONSONANT_RHYME_DIALECT_POLICY;

export type ApprovedConsonantRhymeCategory =
  | "noun"
  | "adjective"
  | "adverb"
  | "verb"
  | "other"
  | (string & {});

export type ApprovedConsonantRhymeStress = "aguda" | "llana";
export type ApprovedConsonantRhymeStatus = "approved" | "pending" | "rejected" | (string & {});
export type ApprovedConsonantRhymeEditorialRole =
  | "preparation"
  | "punchline"
  | "target"
  | (string & {});

export interface ApprovedConsonantRhymeEntry {
  readonly word: string;
  readonly lemma: string;
  readonly normalizedForm: string;
  readonly category: ApprovedConsonantRhymeCategory;
  readonly stress: ApprovedConsonantRhymeStress;
  readonly phoneticTail: string;
  readonly status: ApprovedConsonantRhymeStatus;
  readonly editorialRoles: readonly ApprovedConsonantRhymeEditorialRole[];
  readonly editorialFamily?: string;
}

export interface ConsonantPhoneticTail {
  readonly value: string;
  readonly policyVersion: string;
  readonly equals: (other: ConsonantPhoneticTail) => boolean;
  readonly toString: () => string;
}

export interface ApprovedConsonantRhymeWord {
  readonly word: string;
  readonly lemma: string;
  readonly normalizedForm: string;
  readonly category: ApprovedConsonantRhymeCategory;
  readonly stress: ApprovedConsonantRhymeStress;
  readonly phoneticTail: ConsonantPhoneticTail;
  readonly status: "approved";
  readonly editorialRoles: readonly ApprovedConsonantRhymeEditorialRole[];
  readonly editorialFamily?: ConsonantPhoneticTail;
}

export interface ApprovedConsonantRhymeFamily {
  readonly key: string;
  readonly dictionaryVersion: string;
  readonly tail: ConsonantPhoneticTail;
  readonly words: readonly ApprovedConsonantRhymeWord[];
  readonly equals: (other: ApprovedConsonantRhymeFamily) => boolean;
}

export interface ApprovedConsonantRhymeFilters {
  readonly categories?: readonly ApprovedConsonantRhymeCategory[];
  readonly editorialRoles?: readonly ApprovedConsonantRhymeEditorialRole[];
}

export type ApprovedConsonantRhymeExplanationCode =
  | "approved-rhymes-found"
  | "word-not-indexed"
  | "family-not-indexed"
  | "no-approved-rhyme-in-family"
  | "no-approved-rhyme-after-filters";

export interface ApprovedConsonantRhymeExplanation {
  readonly code: ApprovedConsonantRhymeExplanationCode;
  readonly familyTail?: ConsonantPhoneticTail;
  readonly filters: ApprovedConsonantRhymeFilters;
  readonly consideredApprovedWords: readonly string[];
  readonly exclusions: readonly { readonly word: string; readonly code: string; readonly message: string }[];
}

export interface ApprovedConsonantRhymeLookupResult {
  readonly words: readonly ApprovedConsonantRhymeWord[];
  readonly explanation: ApprovedConsonantRhymeExplanation;
}

export type ApprovedConsonantRhymeCatalogIssue =
  | {
      readonly code: "editorial-family-mismatch";
      readonly word: string;
      readonly phoneticTail: string;
      readonly editorialFamily: string;
    }
  | {
      readonly code: "empty-phonetic-tail";
      readonly word: string;
    };

export interface BuildApprovedConsonantRhymeCatalogInput {
  readonly dictionaryVersion: string;
  readonly entries: readonly ApprovedConsonantRhymeEntry[];
  readonly dialectPolicy?: ConsonantRhymeDialectPolicy;
}

export interface CreateApprovedConsonantRhymeFamilyInput {
  readonly dictionaryVersion: string;
  readonly tail: ConsonantPhoneticTail | string;
  readonly words: readonly ApprovedConsonantRhymeEntry[] | readonly ApprovedConsonantRhymeWord[];
  readonly dialectPolicy?: ConsonantRhymeDialectPolicy;
}

export interface ApprovedConsonantRhymeCatalog {
  readonly dictionaryVersion: string;
  readonly dialectPolicyVersion: string;
  readonly families: readonly ApprovedConsonantRhymeFamily[];
  readonly findFamilyByWord: (word: string) => ApprovedConsonantRhymeFamily | undefined;
  readonly findFamilyByTail: (tail: string | ConsonantPhoneticTail) => ApprovedConsonantRhymeFamily | undefined;
  readonly findRhymesForWord: (
    word: string,
    filters?: ApprovedConsonantRhymeFilters,
  ) => readonly ApprovedConsonantRhymeWord[];
  readonly findRhymesForFamily: (
    tail: string | ConsonantPhoneticTail,
    filters?: ApprovedConsonantRhymeFilters,
  ) => readonly ApprovedConsonantRhymeWord[];
  readonly explainRhymesForWord: (
    word: string,
    filters?: ApprovedConsonantRhymeFilters,
  ) => ApprovedConsonantRhymeLookupResult;
  readonly explainRhymesForFamily: (
    tail: string | ConsonantPhoneticTail,
    filters?: ApprovedConsonantRhymeFilters,
  ) => ApprovedConsonantRhymeLookupResult;
}

export class ApprovedConsonantRhymeCatalogError extends Error {
  readonly issues: readonly ApprovedConsonantRhymeCatalogIssue[];

  constructor(issues: readonly ApprovedConsonantRhymeCatalogIssue[]) {
    super("Approved consonant rhyme catalog contains inconsistent data.");
    this.name = "ApprovedConsonantRhymeCatalogError";
    this.issues = Object.freeze([...issues]);
  }
}

const normalizeToken = (value: string): string =>
  value
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/^\s*-/u, "")
    .replace(/\s+/gu, "");

const normalizeLookupWord = (value: string): string => normalizeToken(value);

const compareSpanishWords = (left: ApprovedConsonantRhymeWord, right: ApprovedConsonantRhymeWord): number =>
  left.normalizedForm.localeCompare(right.normalizedForm, "es", { sensitivity: "base" }) ||
  left.word.localeCompare(right.word, "es", { sensitivity: "base" });

const freezeFilters = (filters: ApprovedConsonantRhymeFilters = {}): ApprovedConsonantRhymeFilters => {
  const frozenFilters: ApprovedConsonantRhymeFilters = Object.freeze({
    ...(filters.categories === undefined ? {} : { categories: Object.freeze([...filters.categories]) }),
    ...(filters.editorialRoles === undefined
      ? {}
      : { editorialRoles: Object.freeze([...filters.editorialRoles]) }),
  });

  return frozenFilters;
};

export function createConsonantPhoneticTail(
  rawTail: string,
  dialectPolicy: ConsonantRhymeDialectPolicy = INITIAL_CONSONANT_RHYME_DIALECT_POLICY,
): ConsonantPhoneticTail {
  const value = normalizeToken(rawTail);

  if (value.length === 0) {
    throw new Error("phonetic tail cannot be empty");
  }

  const tail: ConsonantPhoneticTail = {
    value,
    policyVersion: dialectPolicy.version,
    equals(other: ConsonantPhoneticTail): boolean {
      return this.value === other.value && this.policyVersion === other.policyVersion;
    },
    toString(): string {
      return this.value;
    },
  };

  return Object.freeze(tail);
}

export const createPhoneticTail = createConsonantPhoneticTail;

const asConsonantPhoneticTail = (
  tail: ConsonantPhoneticTail | string,
  dialectPolicy: ConsonantRhymeDialectPolicy,
): ConsonantPhoneticTail =>
  typeof tail === "string" ? createConsonantPhoneticTail(tail, dialectPolicy) : tail;

const isCatalogWord = (
  entry: ApprovedConsonantRhymeEntry | ApprovedConsonantRhymeWord,
): entry is ApprovedConsonantRhymeWord => typeof entry.phoneticTail !== "string";

const toCatalogWord = (
  entry: ApprovedConsonantRhymeEntry | ApprovedConsonantRhymeWord,
  dialectPolicy: ConsonantRhymeDialectPolicy,
): ApprovedConsonantRhymeWord => {
  if (isCatalogWord(entry)) {
    return Object.freeze({
      ...entry,
      editorialRoles: Object.freeze([...entry.editorialRoles]),
    });
  }

  const phoneticTail = createConsonantPhoneticTail(entry.phoneticTail, dialectPolicy);
  const editorialFamily =
    entry.editorialFamily === undefined
      ? undefined
      : createConsonantPhoneticTail(entry.editorialFamily, dialectPolicy);

  return Object.freeze({
    word: entry.word,
    lemma: entry.lemma,
    normalizedForm: normalizeLookupWord(entry.normalizedForm),
    category: entry.category,
    stress: entry.stress,
    phoneticTail,
    status: "approved" as const,
    editorialRoles: Object.freeze([...entry.editorialRoles]),
    ...(editorialFamily === undefined ? {} : { editorialFamily }),
  });
};

const familyKey = (
  dictionaryVersion: string,
  tail: ConsonantPhoneticTail,
): string => `${tail.policyVersion}:${dictionaryVersion}:${tail.value}`;

export function createApprovedConsonantRhymeFamily(
  input: CreateApprovedConsonantRhymeFamilyInput,
): ApprovedConsonantRhymeFamily {
  const dialectPolicy = input.dialectPolicy ?? INITIAL_CONSONANT_RHYME_DIALECT_POLICY;
  const tail = asConsonantPhoneticTail(input.tail, dialectPolicy);
  const words = Object.freeze(
    input.words
      .map((entry) => toCatalogWord(entry, dialectPolicy))
      .filter((word) => word.phoneticTail.equals(tail))
      .sort(compareSpanishWords),
  );
  const key = familyKey(input.dictionaryVersion, tail);
  const family: ApprovedConsonantRhymeFamily = {
    key,
    dictionaryVersion: input.dictionaryVersion,
    tail,
    words,
    equals(other: ApprovedConsonantRhymeFamily): boolean {
      return this.key === other.key;
    },
  };

  return Object.freeze(family);
}

export const createConsonantRhymeFamily = createApprovedConsonantRhymeFamily;

const matchesFilters = (
  word: ApprovedConsonantRhymeWord,
  filters: ApprovedConsonantRhymeFilters,
): boolean => {
  if (filters.categories !== undefined && !filters.categories.includes(word.category)) {
    return false;
  }

  if (
    filters.editorialRoles !== undefined &&
    !filters.editorialRoles.some((role) => word.editorialRoles.includes(role))
  ) {
    return false;
  }

  return true;
};

const explain = (
  words: readonly ApprovedConsonantRhymeWord[],
  familyTail: ConsonantPhoneticTail | undefined,
  filters: ApprovedConsonantRhymeFilters,
  consideredApprovedWords: readonly string[],
  exclusions: readonly { readonly word: string; readonly code: string; readonly message: string }[],
  notIndexedCode: "word-not-indexed" | "family-not-indexed",
): ApprovedConsonantRhymeLookupResult => {
  const hasFilters = filters.categories !== undefined || filters.editorialRoles !== undefined;
  const code: ApprovedConsonantRhymeExplanationCode =
    familyTail === undefined
      ? notIndexedCode
      : words.length > 0
        ? "approved-rhymes-found"
        : hasFilters && consideredApprovedWords.length > 0
          ? "no-approved-rhyme-after-filters"
          : "no-approved-rhyme-in-family";

  return Object.freeze({
    words,
    explanation: Object.freeze({
      code,
      ...(familyTail === undefined ? {} : { familyTail }),
      filters,
      consideredApprovedWords,
      exclusions,
    }),
  });
};

const validateEntries = (
  entries: readonly ApprovedConsonantRhymeEntry[],
  dialectPolicy: ConsonantRhymeDialectPolicy,
): readonly ApprovedConsonantRhymeCatalogIssue[] => {
  const issues: ApprovedConsonantRhymeCatalogIssue[] = [];

  for (const entry of entries) {
    if (entry.status !== "approved") {
      continue;
    }

    let phoneticTail: ConsonantPhoneticTail;
    try {
      phoneticTail = createConsonantPhoneticTail(entry.phoneticTail, dialectPolicy);
    } catch {
      issues.push({ code: "empty-phonetic-tail", word: entry.word });
      continue;
    }

    if (entry.editorialFamily === undefined) {
      continue;
    }

    let editorialFamily: ConsonantPhoneticTail;
    try {
      editorialFamily = createConsonantPhoneticTail(entry.editorialFamily, dialectPolicy);
    } catch {
      issues.push({ code: "empty-phonetic-tail", word: entry.word });
      continue;
    }

    if (!phoneticTail.equals(editorialFamily)) {
      issues.push({
        code: "editorial-family-mismatch",
        word: entry.word,
        phoneticTail: phoneticTail.value,
        editorialFamily: editorialFamily.value,
      });
    }
  }

  return Object.freeze(issues);
};

export function buildApprovedConsonantRhymeCatalog(
  input: BuildApprovedConsonantRhymeCatalogInput,
): ApprovedConsonantRhymeCatalog {
  const dialectPolicy = input.dialectPolicy ?? INITIAL_CONSONANT_RHYME_DIALECT_POLICY;
  const issues = validateEntries(input.entries, dialectPolicy);

  if (issues.length > 0) {
    throw new ApprovedConsonantRhymeCatalogError(issues);
  }

  const words = input.entries
    .filter((entry) => entry.status === "approved")
    .map((entry) => toCatalogWord(entry, dialectPolicy));
  const wordsByFamily = new Map<string, ApprovedConsonantRhymeWord[]>();

  for (const word of words) {
    const familyWords = wordsByFamily.get(word.phoneticTail.value) ?? [];
    familyWords.push(word);
    wordsByFamily.set(word.phoneticTail.value, familyWords);
  }

  const families = Object.freeze(
    [...wordsByFamily.entries()]
      .map(([tailValue, familyWords]) =>
        createApprovedConsonantRhymeFamily({
          dictionaryVersion: input.dictionaryVersion,
          tail: tailValue,
          words: familyWords,
          dialectPolicy,
        }),
      )
      .sort((left, right) => left.tail.value.localeCompare(right.tail.value, "es", { sensitivity: "base" })),
  );
  const familyByTail = new Map(families.map((family) => [family.tail.value, family]));
  const familyByWord = new Map<string, ApprovedConsonantRhymeFamily>();

  for (const family of families) {
    for (const word of family.words) {
      familyByWord.set(word.normalizedForm, family);
    }
  }

  const rhymesForFamily = (
    family: ApprovedConsonantRhymeFamily | undefined,
    filters: ApprovedConsonantRhymeFilters,
    sourceWord?: string,
  ): readonly ApprovedConsonantRhymeWord[] => {
    if (family === undefined) {
      return Object.freeze([]);
    }

    const normalizedSourceWord = sourceWord === undefined ? undefined : normalizeLookupWord(sourceWord);
    return Object.freeze(
      family.words.filter(
        (word) => word.normalizedForm !== normalizedSourceWord && matchesFilters(word, filters),
      ),
    );
  };

  const explainForFamily = (
    family: ApprovedConsonantRhymeFamily | undefined,
    filters: ApprovedConsonantRhymeFilters,
    notIndexedCode: "word-not-indexed" | "family-not-indexed",
    sourceWord?: string,
  ): ApprovedConsonantRhymeLookupResult => {
    const normalizedSourceWord = sourceWord === undefined ? undefined : normalizeLookupWord(sourceWord);
    const considered = Object.freeze(
      family === undefined
        ? []
        : family.words
            .filter((word) => word.normalizedForm !== normalizedSourceWord)
            .map((word) => word.word),
    );
    const filteredWords = rhymesForFamily(family, filters, sourceWord);

    const exclusions = family === undefined ? [] : family.words
      .filter((word) => word.normalizedForm !== normalizedSourceWord && !matchesFilters(word, filters))
      .map((word) => ({
        word: word.word,
        code: filters.categories !== undefined && !filters.categories.includes(word.category)
          ? "CATEGORY_MISMATCH" : "ROLE_NOT_ALLOWED",
        message: "La palabra fue excluida por los filtros solicitados.",
      }));
    return explain(filteredWords, family?.tail, filters, considered, exclusions, notIndexedCode);
  };

  const catalog: ApprovedConsonantRhymeCatalog = {
    dictionaryVersion: input.dictionaryVersion,
    dialectPolicyVersion: dialectPolicy.version,
    families,
    findFamilyByWord(word: string): ApprovedConsonantRhymeFamily | undefined {
      return familyByWord.get(normalizeLookupWord(word));
    },
    findFamilyByTail(tail: string | ConsonantPhoneticTail): ApprovedConsonantRhymeFamily | undefined {
      return familyByTail.get(asConsonantPhoneticTail(tail, dialectPolicy).value);
    },
    findRhymesForWord(
      word: string,
      filters: ApprovedConsonantRhymeFilters = {},
    ): readonly ApprovedConsonantRhymeWord[] {
      return rhymesForFamily(this.findFamilyByWord(word), freezeFilters(filters), word);
    },
    findRhymesForFamily(
      tail: string | ConsonantPhoneticTail,
      filters: ApprovedConsonantRhymeFilters = {},
    ): readonly ApprovedConsonantRhymeWord[] {
      return rhymesForFamily(this.findFamilyByTail(tail), freezeFilters(filters));
    },
    explainRhymesForWord(
      word: string,
      filters: ApprovedConsonantRhymeFilters = {},
    ): ApprovedConsonantRhymeLookupResult {
      return explainForFamily(this.findFamilyByWord(word), freezeFilters(filters), "word-not-indexed", word);
    },
    explainRhymesForFamily(
      tail: string | ConsonantPhoneticTail,
      filters: ApprovedConsonantRhymeFilters = {},
    ): ApprovedConsonantRhymeLookupResult {
      return explainForFamily(this.findFamilyByTail(tail), freezeFilters(filters), "family-not-indexed");
    },
  };

  return Object.freeze(catalog);
}

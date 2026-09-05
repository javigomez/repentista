import type {
  InspectApprovedRhymesRequest,
  InspectApprovedRhymesResult,
} from "../../../application/inspect-approved-rhymes/index.js";
import { createInspectApprovedRhymes } from "../../../application/inspect-approved-rhymes/index.js";
import type { ApprovedWordDictionary } from "../../../content/approved-word-dictionary/index.js";
import type { WordAnalysisPort } from "../../../ports/index.js";
import type { ApprovedConsonantRhymeCatalog } from "../../../content/approved-consonant-rhyme-catalog/index.js";

export const INSPECT_RHYMES_EXIT_CODES = Object.freeze({
  SUCCESS: 0,
  UNKNOWN_WORD: 1,
  DICTIONARY_VERSION_UNAVAILABLE: 2,
  DOUBTFUL_ANALYSIS: 3,
  INVALID_ARGUMENTS: 4,
} as const);

export interface InspectRhymesCliDependencies {
  readonly dictionary: ApprovedWordDictionary;
  readonly analyzer: WordAnalysisPort;
  readonly catalog?: ApprovedConsonantRhymeCatalog;
}

export interface InspectRhymesCliArgs {
  readonly word: string;
  readonly dictionaryVersion: string;
  readonly category?: string;
  readonly role?: string;
}

export type InspectRhymesCliArgsError =
  | { readonly code: "MISSING_WORD" }
  | { readonly code: "MISSING_DICTIONARY_VERSION" };

export type InspectRhymesCliArgsResult =
  | { readonly ok: true; readonly args: InspectRhymesCliArgs }
  | { readonly ok: false; readonly error: InspectRhymesCliArgsError };

export function parseInspectRhymesArgs(
  argv: readonly string[],
): InspectRhymesCliArgsResult {
  let word: string | undefined;
  let dictionaryVersion: string | undefined;
  let category: string | undefined;
  let role: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--word" || arg === "-w") {
      word = argv[++i];
    } else if (arg === "--dictionary-version" || arg === "-d") {
      dictionaryVersion = argv[++i];
    } else if (arg === "--category" || arg === "-c") {
      category = argv[++i];
    } else if (arg === "--role" || arg === "-r") {
      role = argv[++i];
    }
  }

  if (word === undefined || word.trim().length === 0) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({ code: "MISSING_WORD" as const }),
    });
  }

  if (
    dictionaryVersion === undefined ||
    dictionaryVersion.trim().length === 0
  ) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({ code: "MISSING_DICTIONARY_VERSION" as const }),
    });
  }

  return Object.freeze({
    ok: true as const,
    args: Object.freeze({
      word: word.trim(),
      dictionaryVersion: dictionaryVersion.trim(),
      category,
      role,
    }),
  });
}

export function inspectRhymesExitCode(
  result: InspectApprovedRhymesResult,
): number {
  if (result.ok) return INSPECT_RHYMES_EXIT_CODES.SUCCESS;

  switch (result.error.code) {
    case "UNKNOWN_WORD":
      return INSPECT_RHYMES_EXIT_CODES.UNKNOWN_WORD;
    case "DICTIONARY_VERSION_UNAVAILABLE":
      return INSPECT_RHYMES_EXIT_CODES.DICTIONARY_VERSION_UNAVAILABLE;
    case "DOUBTFUL_ANALYSIS":
      return INSPECT_RHYMES_EXIT_CODES.DOUBTFUL_ANALYSIS;
    case "CATALOG_INCONSISTENCY":
      return INSPECT_RHYMES_EXIT_CODES.DOUBTFUL_ANALYSIS;
  }
}

export function runInspectRhymesCommand(
  deps: InspectRhymesCliDependencies,
  argv: readonly string[],
): { readonly exitCode: number; readonly output: string } {
  const parsed = parseInspectRhymesArgs(argv);

  if (!parsed.ok) {
    const errorOutput = JSON.stringify(
      { ok: false, error: parsed.error },
      null,
      2,
    );
    return Object.freeze({
      exitCode: INSPECT_RHYMES_EXIT_CODES.INVALID_ARGUMENTS,
      output: errorOutput,
    });
  }

  const service = createInspectApprovedRhymes({
    dictionary: deps.dictionary,
    analyzer: deps.analyzer,
    catalog: deps.catalog ?? {
      dictionaryVersion: parsed.args.dictionaryVersion,
      dialectPolicyVersion: "unconfigured",
      families: [],
      findFamilyByWord: () => undefined,
      findFamilyByTail: () => undefined,
      findRhymesForWord: () => [],
      findRhymesForFamily: () => [],
      explainRhymesForWord: () => ({ words: [], explanation: { code: "word-not-indexed", filters: {}, consideredApprovedWords: [], exclusions: [] } }),
      explainRhymesForFamily: () => ({ words: [], explanation: { code: "family-not-indexed", filters: {}, consideredApprovedWords: [], exclusions: [] } }),
    },
  });

  const request: InspectApprovedRhymesRequest = {
    word: parsed.args.word,
    dictionaryVersion: parsed.args.dictionaryVersion,
    category: parsed.args.category,
    role: parsed.args.role,
  };

  const result = service.inspect(request);
  const output = JSON.stringify(result, null, 2);
  const exitCode = inspectRhymesExitCode(result);

  return Object.freeze({ exitCode, output });
}

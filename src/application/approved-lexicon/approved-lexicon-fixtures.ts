import {
  createInMemoryApprovedWordDictionary,
  type ApprovedWordDictionary,
  type ApprovedWordInput,
} from "../../content/approved-word-dictionary/index.js";
import type {
  ControlledWordInput,
  LexiconViolationCode,
} from "./approved-lexicon.js";

export const APPROVED_LEXICON_GOLD_VERSION = "dictionary-2026-08-30";

export function approvedWord(overrides: Partial<ApprovedWordInput> = {}): ApprovedWordInput {
  return {
    version: APPROVED_LEXICON_GOLD_VERSION,
    form: "dragón",
    lemma: "dragón",
    tonicity: "aguda",
    category: "sustantivo",
    level: "basico",
    status: "approved",
    allowedAsPreparation: true,
    allowedAsPunchline: true,
    ...overrides,
  };
}

export function createLexiconDictionary(
  words: readonly ApprovedWordInput[],
): ApprovedWordDictionary {
  return createInMemoryApprovedWordDictionary({
    versions: { [APPROVED_LEXICON_GOLD_VERSION]: words },
  });
}

export interface ApprovedLexiconGoldExpected {
  readonly verdict: "VALIDO" | "INVALIDO";
  readonly violationCodes?: readonly LexiconViolationCode[];
}

export interface ApprovedLexiconGoldFixture {
  readonly id: string;
  readonly description: string;
  readonly controlledWords: readonly ControlledWordInput[];
  readonly dictionary: readonly ApprovedWordInput[];
  readonly expected: ApprovedLexiconGoldExpected;
}

export const APPROVED_LEXICON_GOLD_FIXTURES: readonly ApprovedLexiconGoldFixture[] = Object.freeze([
  Object.freeze({
    id: "valid_authorized_v2_v4",
    description: "V2 y V4 autorizadas para preparación y remate respectivamente.",
    controlledWords: Object.freeze([
      Object.freeze({ slot: "V2" as const, form: "balcón", permission: "PREPARATION" as const }),
      Object.freeze({ slot: "V4" as const, form: "dragón", permission: "PUNCHLINE" as const }),
    ]),
    dictionary: Object.freeze([
      approvedWord({ form: "balcón", lemma: "balcón", allowedAsPreparation: true, allowedAsPunchline: true }),
      approvedWord({ form: "dragón", lemma: "dragón", allowedAsPreparation: true, allowedAsPunchline: true }),
    ]),
    expected: Object.freeze({ verdict: "VALIDO" as const }),
  }),
  Object.freeze({
    id: "invalid_missing_v2",
    description: "V2 no existe en el snapshot y se informa como ausente.",
    controlledWords: Object.freeze([
      Object.freeze({ slot: "V2" as const, form: "jirafa", permission: "PREPARATION" as const }),
      Object.freeze({ slot: "V4" as const, form: "dragón", permission: "PUNCHLINE" as const }),
    ]),
    dictionary: Object.freeze([approvedWord({ form: "dragón", lemma: "dragón" })]),
    expected: Object.freeze({ verdict: "INVALIDO" as const, violationCodes: Object.freeze(["MISSING_WORD" as const]) }),
  }),
  Object.freeze({
    id: "invalid_pending_v4",
    description: "V4 existe pero está pendiente, no aprobada.",
    controlledWords: Object.freeze([
      Object.freeze({ slot: "V2" as const, form: "balcón", permission: "PREPARATION" as const }),
      Object.freeze({ slot: "V4" as const, form: "ruego", permission: "PUNCHLINE" as const }),
    ]),
    dictionary: Object.freeze([
      approvedWord({ form: "balcón", lemma: "balcón" }),
      approvedWord({ form: "ruego", lemma: "ruego", status: "pending", allowedAsPunchline: false }),
    ]),
    expected: Object.freeze({ verdict: "INVALIDO" as const, violationCodes: Object.freeze(["PENDING_WORD" as const]) }),
  }),
  Object.freeze({
    id: "invalid_role_not_allowed_v2",
    description: "V2 está aprobada pero no permite el rol de preparación.",
    controlledWords: Object.freeze([
      Object.freeze({ slot: "V2" as const, form: "dragón", permission: "PREPARATION" as const }),
      Object.freeze({ slot: "V4" as const, form: "balcón", permission: "PUNCHLINE" as const }),
    ]),
    dictionary: Object.freeze([
      approvedWord({ form: "dragón", lemma: "dragón", allowedAsPreparation: false, allowedAsPunchline: true }),
      approvedWord({ form: "balcón", lemma: "balcón" }),
    ]),
    expected: Object.freeze({ verdict: "INVALIDO" as const, violationCodes: Object.freeze(["ROLE_NOT_ALLOWED" as const]) }),
  }),
  Object.freeze({
    id: "invalid_exhaustive_v2_v4",
    description: "V2 ausente y V4 pendiente se informan juntas sin detenerse en la primera.",
    controlledWords: Object.freeze([
      Object.freeze({ slot: "V2" as const, form: "jirafa", permission: "PREPARATION" as const }),
      Object.freeze({ slot: "V4" as const, form: "ruego", permission: "PUNCHLINE" as const }),
    ]),
    dictionary: Object.freeze([
      approvedWord({ form: "balcón", lemma: "balcón" }),
      approvedWord({ form: "ruego", lemma: "ruego", status: "pending" }),
    ]),
    expected: Object.freeze({
      verdict: "INVALIDO" as const,
      violationCodes: Object.freeze(["MISSING_WORD" as const, "PENDING_WORD" as const]),
    }),
  }),
]);

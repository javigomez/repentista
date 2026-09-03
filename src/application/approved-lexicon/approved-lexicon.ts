import type { ApprovedWordDictionary } from "../../content/approved-word-dictionary/index.js";
import type {
  ValidationVerdict,
  ValidatorDiagnosticInput,
  VerseSlot,
} from "../../domain/quatrain-candidate/index.js";

export const APPROVED_LEXICON_VALIDATOR_NAME = "approved-lexicon";
export const APPROVED_LEXICON_VALIDATOR_VERSION = "approved-lexicon-validator/0.1.0";

/** The editorial role a controlled word must be permitted for. */
export type LexiconRolePermission = "PREPARATION" | "PUNCHLINE";

/**
 * A word the plan requires to come from the approved editorial dictionary.
 * Functional words (articles, prepositions) are never listed here, so the
 * validator does not over-require them from the rhyme bank.
 */
export interface ControlledWordInput {
  readonly slot: VerseSlot;
  readonly form: string;
  readonly permission: LexiconRolePermission;
}

export type LexiconViolationCode = "MISSING_WORD" | "PENDING_WORD" | "ROLE_NOT_ALLOWED";

export type LexiconFoundStatus = "missing" | "pending" | "approved";

export interface LexiconViolation {
  readonly slot: VerseSlot;
  readonly form: string;
  readonly normalizedForm: string;
  readonly code: LexiconViolationCode;
  readonly foundStatus: LexiconFoundStatus;
  readonly requiredPermission?: LexiconRolePermission;
  readonly message: string;
}

export interface CheckedWordReference {
  readonly slot: VerseSlot;
  readonly form: string;
  readonly normalizedForm: string;
  readonly dictionaryVersion: string;
  readonly permission: LexiconRolePermission;
}

export interface ApprovedLexiconResult {
  readonly validator: string;
  readonly version: string;
  readonly dictionaryVersion: string;
  readonly verdict: Extract<ValidationVerdict, "VALIDO" | "INVALIDO">;
  readonly checkedWords: readonly CheckedWordReference[];
  readonly violations: readonly LexiconViolation[];
}

export interface ApprovedLexiconOperationalError {
  readonly code: "DICTIONARY_VERSION_UNAVAILABLE";
  readonly version: string;
  readonly availableVersions: readonly string[];
}

export type ApprovedLexiconValidationResult =
  | { readonly ok: true; readonly value: ApprovedLexiconResult }
  | { readonly ok: false; readonly error: ApprovedLexiconOperationalError };

export interface ApprovedLexiconValidationRequest {
  readonly dictionaryVersion: string;
  readonly controlledWords: readonly ControlledWordInput[];
}

export interface ApprovedLexiconValidatorOptions {
  readonly dictionary: ApprovedWordDictionary;
}

export interface ApprovedLexiconValidator {
  readonly validator: string;
  readonly version: string;
  validate(request: ApprovedLexiconValidationRequest): ApprovedLexiconValidationResult;
}

const isAllowed = (entry: {
  readonly allowedAsPreparation: boolean;
  readonly allowedAsPunchline: boolean;
}, permission: LexiconRolePermission): boolean =>
  permission === "PREPARATION" ? entry.allowedAsPreparation : entry.allowedAsPunchline;

const missingViolation = (word: ControlledWordInput, normalizedForm: string): LexiconViolation =>
  Object.freeze({
    slot: word.slot,
    form: word.form,
    normalizedForm,
    code: "MISSING_WORD" as const,
    foundStatus: "missing" as const,
    message: `La palabra "${word.form}" del slot ${word.slot} no existe en el diccionario aprobado.`,
  });

const pendingViolation = (
  word: ControlledWordInput,
  normalizedForm: string,
): LexiconViolation =>
  Object.freeze({
    slot: word.slot,
    form: word.form,
    normalizedForm,
    code: "PENDING_WORD" as const,
    foundStatus: "pending" as const,
    message: `La palabra "${word.form}" del slot ${word.slot} está pendiente y no aprobada.`,
  });

const roleViolation = (
  word: ControlledWordInput,
  normalizedForm: string,
): LexiconViolation =>
  Object.freeze({
    slot: word.slot,
    form: word.form,
    normalizedForm,
    code: "ROLE_NOT_ALLOWED" as const,
    foundStatus: "approved" as const,
    requiredPermission: word.permission,
    message: `La palabra "${word.form}" del slot ${word.slot} no está habilitada para el rol ${word.permission}.`,
  });

const checkedReference = (
  word: ControlledWordInput,
  normalizedForm: string,
  dictionaryVersion: string,
): CheckedWordReference =>
  Object.freeze({
    slot: word.slot,
    form: word.form,
    normalizedForm,
    dictionaryVersion,
    permission: word.permission,
  });

export function createApprovedLexiconValidator(
  options: ApprovedLexiconValidatorOptions,
): ApprovedLexiconValidator {
  const dictionary = options.dictionary;

  return Object.freeze({
    validator: APPROVED_LEXICON_VALIDATOR_NAME,
    version: APPROVED_LEXICON_VALIDATOR_VERSION,
    validate(request: ApprovedLexiconValidationRequest): ApprovedLexiconValidationResult {
      const checkedWords: CheckedWordReference[] = [];
      const violations: LexiconViolation[] = [];

      for (const word of request.controlledWords) {
        const lookup = dictionary.findByForm({
          version: request.dictionaryVersion,
          form: word.form,
        });

        if (!lookup.ok) {
          return Object.freeze({
            ok: false as const,
            error: Object.freeze({
              code: "DICTIONARY_VERSION_UNAVAILABLE" as const,
              version: lookup.error.version,
              availableVersions: lookup.error.availableVersions,
            }),
          });
        }

        if (lookup.status === "missing") {
          violations.push(missingViolation(word, lookup.normalizedForm));
          continue;
        }

        if (lookup.entry.status !== "approved") {
          violations.push(pendingViolation(word, lookup.entry.normalizedForm));
          continue;
        }

        if (!isAllowed(lookup.entry, word.permission)) {
          violations.push(roleViolation(word, lookup.entry.normalizedForm));
          continue;
        }

        checkedWords.push(
          checkedReference(word, lookup.entry.normalizedForm, request.dictionaryVersion),
        );
      }

      const verdict: ApprovedLexiconResult["verdict"] =
        violations.length === 0 ? "VALIDO" : "INVALIDO";

      return Object.freeze({
        ok: true as const,
        value: Object.freeze({
          validator: APPROVED_LEXICON_VALIDATOR_NAME,
          version: APPROVED_LEXICON_VALIDATOR_VERSION,
          dictionaryVersion: request.dictionaryVersion,
          verdict,
          checkedWords: Object.freeze(checkedWords),
          violations: Object.freeze(violations),
        }),
      });
    },
  });
}

export function toApprovedLexiconDiagnostic(
  result: ApprovedLexiconResult,
): ValidatorDiagnosticInput {
  const summary =
    result.violations.length === 0
      ? `${result.checkedWords.length} palabra(s) controlada(s) autorizada(s)`
      : result.violations
          .map((violation) => `${violation.slot}:${violation.code}`)
          .join(", ");

  return Object.freeze({
    validator: result.validator,
    version: result.version,
    result: result.verdict,
    evidence: Object.freeze({
      pointer: `approved-lexicon:${result.dictionaryVersion}`,
      summary,
    }),
  });
}

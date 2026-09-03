import type { ValidatorDiagnosticInput } from "../../domain/quatrain-candidate/index.js";

export const CONSONANT_RHYME_VALIDATOR = "consonant-rhyme-0a0a";
export const CONSONANT_RHYME_VERSION = "consonant-rhyme-validator/0.1.0";

export interface FinalWordPhoneticValue {
  readonly form: string;
  readonly family: string | undefined;
  readonly tail: string | undefined;
  readonly analysis: "CONFIABLE" | "DUDOSO";
}

export interface ConsonantRhymeValidationRequest {
  readonly dictionaryVersion: string;
  readonly finals: Partial<
    Record<"V1" | "V2" | "V3" | "V4", FinalWordPhoneticValue>
  >;
}

export type ConsonantRhymeFailure =
  | { readonly code: "UNTRUSTED_ANALYSIS"; readonly forms: readonly string[] }
  | { readonly code: "ASSONANCE_ONLY"; readonly forms: readonly string[] }
  | { readonly code: "FAMILY_NOT_APPROVED"; readonly forms: readonly string[] };

export interface ConsonantRhymeResult {
  readonly validator: typeof CONSONANT_RHYME_VALIDATOR;
  readonly version: typeof CONSONANT_RHYME_VERSION;
  readonly dictionaryVersion: string;
  readonly verdict: "VALIDO" | "INVALIDO" | "DUDOSO";
  readonly requiredPair: {
    readonly slots: readonly ["V2", "V4"];
    readonly family?: string;
    readonly tails?: readonly [string, string];
  };
  readonly accidentalMatches: readonly ("V1" | "V3")[];
  readonly failure?: ConsonantRhymeFailure;
}

function sameFamily(
  a: FinalWordPhoneticValue,
  b: FinalWordPhoneticValue,
): boolean {
  return (
    a.family !== undefined &&
    a.family === b.family &&
    a.tail !== undefined &&
    a.tail === b.tail
  );
}

export function createConsonantRhymeValidator() {
  return Object.freeze({
    validator: CONSONANT_RHYME_VALIDATOR,
    version: CONSONANT_RHYME_VERSION,
    validate(request: ConsonantRhymeValidationRequest): ConsonantRhymeResult {
      const v2 = request.finals.V2;
      const v4 = request.finals.V4;
      const pair = { slots: ["V2", "V4"] as ["V2", "V4"] };
      if (
        v2 === undefined ||
        v4 === undefined ||
        v2.analysis === "DUDOSO" ||
        v4.analysis === "DUDOSO"
      ) {
        return {
          validator: CONSONANT_RHYME_VALIDATOR,
          version: CONSONANT_RHYME_VERSION,
          dictionaryVersion: request.dictionaryVersion,
          verdict: "DUDOSO",
          requiredPair: pair,
          accidentalMatches: [],
          failure: {
            code: "UNTRUSTED_ANALYSIS",
            forms: [v2?.form ?? "V2", v4?.form ?? "V4"],
          },
        };
      }
      const accidentalMatches = (["V1", "V3"] as const).filter((slot) => {
        const value = request.finals[slot];
        return (
          value !== undefined &&
          value.analysis === "CONFIABLE" &&
          sameFamily(value, v2)
        );
      });
      if (!sameFamily(v2, v4)) {
        const code =
          v2.family !== undefined && v2.family === v4.family
            ? "ASSONANCE_ONLY"
            : "FAMILY_NOT_APPROVED";
        return {
          validator: CONSONANT_RHYME_VALIDATOR,
          version: CONSONANT_RHYME_VERSION,
          dictionaryVersion: request.dictionaryVersion,
          verdict: "INVALIDO",
          requiredPair: pair,
          accidentalMatches,
          failure: { code, forms: [v2.form, v4.form] },
        };
      }
      const family = v2.family;
      const v2Tail = v2.tail;
      const v4Tail = v4.tail;
      if (
        family === undefined ||
        v2Tail === undefined ||
        v4Tail === undefined
      ) {
        throw new Error("Consonant rhyme invariant was not established.");
      }
      return {
        validator: CONSONANT_RHYME_VALIDATOR,
        version: CONSONANT_RHYME_VERSION,
        dictionaryVersion: request.dictionaryVersion,
        verdict: "VALIDO",
        requiredPair: { slots: ["V2", "V4"], family, tails: [v2Tail, v4Tail] },
        accidentalMatches,
      };
    },
  });
}

export function toConsonantRhymeDiagnostic(
  result: ConsonantRhymeResult,
): ValidatorDiagnosticInput {
  const pairInfo =
    result.requiredPair.family !== undefined
      ? `V2↔V4 familia:${result.requiredPair.family} colas:${result.requiredPair.tails?.join(",") ?? "n/a"}`
      : `V2↔V4 sin familia compartida`;

  const accidentalInfo =
    result.accidentalMatches.length > 0
      ? ` coincidencias accidentales:${result.accidentalMatches.join(",")}`
      : "";

  const failureInfo =
    result.failure !== undefined
      ? ` ${result.failure.code}:${result.failure.forms.join(",")}`
      : "";

  const summary = `${pairInfo}${accidentalInfo}${failureInfo}`;

  return Object.freeze({
    validator: result.validator,
    version: result.version,
    result: result.verdict,
    evidence: Object.freeze({
      pointer: `consonant-rhyme-0a0a:${result.dictionaryVersion}`,
      summary,
    }),
  });
}

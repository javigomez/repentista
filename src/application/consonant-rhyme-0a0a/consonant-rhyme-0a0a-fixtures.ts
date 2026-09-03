import type { FinalWordPhoneticValue } from "./consonant-rhyme-0a0a.js";

export function consonantValue(
  form: string,
  family: string,
  tail: string,
): FinalWordPhoneticValue {
  return { form, family, tail, analysis: "CONFIABLE" };
}

export function doubtfulValue(form: string): FinalWordPhoneticValue {
  return { form, family: undefined, tail: undefined, analysis: "DUDOSO" };
}

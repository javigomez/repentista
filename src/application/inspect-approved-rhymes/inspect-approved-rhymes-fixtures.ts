import type { ApprovedWordInput } from "../../content/approved-word-dictionary/index.js";
import { createInMemoryApprovedWordDictionary } from "../../content/approved-word-dictionary/index.js";
import { buildApprovedConsonantRhymeCatalog } from "../../content/approved-consonant-rhyme-catalog/index.js";

export const INSPECT_RHYMES_DICTIONARY_VERSION = "dictionary-2026-08-30";

export function inspectWord(overrides: Partial<ApprovedWordInput> = {}): ApprovedWordInput {
  return {
    version: INSPECT_RHYMES_DICTIONARY_VERSION,
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

export function createInspectRhymesDictionary() {
  return createInMemoryApprovedWordDictionary({
    versions: {
      [INSPECT_RHYMES_DICTIONARY_VERSION]: [
        inspectWord({ form: "dragón" }),
        inspectWord({ form: "balcón", lemma: "balcón", category: "sustantivo", allowedAsPreparation: true }),
        inspectWord({ form: "canción", lemma: "canción", category: "sustantivo", allowedAsPreparation: false }),
        inspectWord({ form: "marrón", lemma: "marrón", category: "adjetivo", allowedAsPunchline: false }),
      ],
    },
  });
}

export function createInspectRhymesCatalog() {
  return buildApprovedConsonantRhymeCatalog({
    dictionaryVersion: INSPECT_RHYMES_DICTIONARY_VERSION,
    entries: ["dragón", "balcón", "canción", "marrón"].map((word) => ({
      word, lemma: word, normalizedForm: word,
      category: word === "marrón" ? "adjetivo" : "sustantivo",
      stress: "aguda" as const, phoneticTail: "ón", status: "approved" as const,
      editorialRoles: word === "canción" ? ["punchline" as const] : ["preparation" as const, "punchline" as const],
    })),
  });
}

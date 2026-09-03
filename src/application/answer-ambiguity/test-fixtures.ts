import type { AnswerAmbiguityWord, AnswerAmbiguityRequest } from "./index.js";

export const ambiguityWord = (
  overrides: Partial<AnswerAmbiguityWord> = {},
): AnswerAmbiguityWord => ({
  id: "word:dragon",
  form: "dragón",
  dictionaryVersion: "dictionary-2026-08-30",
  rhymeFamilyId: "family:on",
  role: "REMATE",
  category: "sustantivo",
  ...overrides,
});

export const ambiguityRequest = (
  overrides: Partial<AnswerAmbiguityRequest> = {},
): AnswerAmbiguityRequest => ({
  dictionaryVersion: "dictionary-2026-08-30",
  targetWordId: "word:dragon",
  rhymeFamilyId: "family:on",
  role: "REMATE",
  allowedCategories: ["sustantivo"],
  catalog: [ambiguityWord()],
  ...overrides,
});

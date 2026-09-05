export type QuatrainSlot = "V1" | "V2" | "V3" | "V4";
export type QuatrainRole =
  "PRESENTACION" | "PREPARACION" | "GIRO_TENSION" | "REMATE";

export interface QuatrainVerseInput {
  readonly slot: QuatrainSlot;
  readonly role: QuatrainRole;
  readonly text: string;
}

export interface QuatrainStructureInput {
  readonly rhymeScheme: string;
  readonly verses: readonly QuatrainVerseInput[];
  readonly plannedFinalWords: Readonly<{ V2: string; V4: string }>;
}

export type QuatrainStructureViolationCode =
  | "EXPECTED_FOUR_VERSES"
  | "EMPTY_VERSE_TEXT"
  | "INVALID_VERSE_ORDER"
  | "INVALID_VERSE_ROLE"
  | "UNSUPPORTED_RHYME_SCHEME"
  | "PLANNED_FINAL_WORD_MISMATCH";

export interface QuatrainStructureViolation {
  readonly code: QuatrainStructureViolationCode;
  readonly path: string;
  readonly message: string;
}

export interface QuatrainStructureValidationResult {
  readonly verdict: "VALIDO" | "DUDOSO" | "INVALIDO";
  readonly checks: readonly string[];
  readonly violations: readonly QuatrainStructureViolation[];
}

const expected = [
  { slot: "V1", role: "PRESENTACION" },
  { slot: "V2", role: "PREPARACION" },
  { slot: "V3", role: "GIRO_TENSION" },
  { slot: "V4", role: "REMATE" },
] as const;

const TERMINAL_PUNCTUATION_RE = /[.,;:!?\u00BF\u00A1]+$/u;

function stripTerminalPunctuation(text: string): string {
  return text.replace(TERMINAL_PUNCTUATION_RE, "").trim();
}

function lastWord(text: string): string {
  const stripped = stripTerminalPunctuation(text);
  const parts = stripped.split(/\s+/);
  return parts[parts.length - 1] ?? "";
}

export function validateQuatrainStructure(
  input: QuatrainStructureInput,
): QuatrainStructureValidationResult {
  const violations: QuatrainStructureViolation[] = [];
  const checks = [
    "FOUR_VERSES",
    "NON_EMPTY_TEXT",
    "ORDERED_ROLES",
    "FIXED_RHYME_SCHEME",
    "PLANNED_FINAL_WORDS",
  ];

  if (input.verses.length !== 4) {
    violations.push({
      code: "EXPECTED_FOUR_VERSES",
      path: "verses",
      message: "La cuarteta debe contener exactamente cuatro versos.",
    });
  }

  for (const [index, verse] of input.verses.entries()) {
    if (verse.text.trim().length === 0) {
      violations.push({
        code: "EMPTY_VERSE_TEXT",
        path: `verses[${index}].text`,
        message: "El texto del verso no puede estar vacío.",
      });
    }
    const expectedVerse = expected[index];
    if (expectedVerse === undefined || verse.slot !== expectedVerse.slot) {
      violations.push({
        code: "INVALID_VERSE_ORDER",
        path: `verses[${index}].slot`,
        message: "Los versos deben estar ordenados V1, V2, V3 y V4.",
      });
    }
    if (expectedVerse !== undefined && verse.role !== expectedVerse.role) {
      violations.push({
        code: "INVALID_VERSE_ROLE",
        path: `verses[${index}].role`,
        message: `El rol esperado para ${expectedVerse.slot} es ${expectedVerse.role}.`,
      });
    }
  }

  if (input.rhymeScheme !== "0-A-0-A") {
    violations.push({
      code: "UNSUPPORTED_RHYME_SCHEME",
      path: "rhymeScheme",
      message: "Solo se admite el esquema 0-A-0-A.",
    });
  }

  const plannedChecks: ReadonlyArray<{ index: number; slot: "V2" | "V4" }> = [
    { index: 1, slot: "V2" },
    { index: 3, slot: "V4" },
  ];

  for (const { index, slot } of plannedChecks) {
    const verse = input.verses[index];
    if (verse === undefined) continue;

    const planned = input.plannedFinalWords[slot];
    const actual = lastWord(verse.text);

    if (actual.toLowerCase() !== planned.toLowerCase()) {
      violations.push({
        code: "PLANNED_FINAL_WORD_MISMATCH",
        path: `verses[${index}].text`,
        message: `El verso ${slot} debe terminar con «${planned}», pero termina con «${actual}».`,
      });
    }
  }

  return Object.freeze({
    verdict: violations.length === 0 ? "VALIDO" : "INVALIDO",
    checks: Object.freeze(checks),
    violations: Object.freeze(violations),
  });
}

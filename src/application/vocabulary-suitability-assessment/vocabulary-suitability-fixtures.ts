import {
  createInMemoryApprovedWordDictionary,
  type ApprovedWordDictionary,
  type ApprovedWordInput,
} from "../../content/approved-word-dictionary/index.js";
import type {
  VocabularySuitabilityIssue,
  VerseSlot,
} from "../../domain/quatrain-candidate/index.js";
import type { VocabularySuitabilityVerse } from "./index.js";

export const VOCABULARY_GOLD_VERSION = "dictionary-2026-08-30";

export function vocabularyWord(overrides: Partial<ApprovedWordInput> = {}): ApprovedWordInput {
  return {
    version: VOCABULARY_GOLD_VERSION,
    form: "melón",
    lemma: "melón",
    tonicity: "aguda",
    category: "sustantivo",
    level: "basico",
    status: "approved",
    allowedAsPreparation: true,
    allowedAsPunchline: true,
    ...overrides,
  };
}

export function createVocabularyDictionary(
  words: readonly ApprovedWordInput[],
): ApprovedWordDictionary {
  return createInMemoryApprovedWordDictionary({
    versions: { [VOCABULARY_GOLD_VERSION]: words },
  });
}

export interface VocabularyLlmJudgeOutput {
  readonly note: number;
  readonly confidence: number;
  readonly flaggedWords: readonly {
    readonly slot: VerseSlot;
    readonly form: string;
    readonly issue: VocabularySuitabilityIssue;
    readonly reason: string;
    readonly alternatives: readonly string[];
  }[];
}

export interface VocabularyGoldFixture {
  readonly id: string;
  readonly description: string;
  readonly verses: readonly VocabularySuitabilityVerse[];
  readonly dictionary: readonly ApprovedWordInput[];
  readonly judge: VocabularyLlmJudgeOutput;
  readonly expectedNote: number;
  readonly expectedIssues: readonly VocabularySuitabilityIssue[];
  readonly expectedMetadataForms: readonly string[];
}

const verse = (slot: VerseSlot, text: string): VocabularySuitabilityVerse =>
  Object.freeze({ slot, text });

export const VOCABULARY_GOLD_FIXTURES: readonly VocabularyGoldFixture[] = Object.freeze([
  Object.freeze({
    id: "clear_everyday_vocabulary",
    description: "Vocabulario cotidiano y claro, sin obstáculos para 10-12 años.",
    verses: Object.freeze([
      verse("V1", "El gato reparte su merienda por el balcón."),
      verse("V2", "Guarda un melón para su vecino más leal."),
      verse("V3", "Nadie se queda sin un trozo del pastel."),
      verse("V4", "Y comparte con todos su pan y su alegría."),
    ]),
    dictionary: Object.freeze([
      vocabularyWord({ form: "balcón", lemma: "balcón" }),
      vocabularyWord({ form: "melón", lemma: "melón" }),
      vocabularyWord({ form: "vecino", lemma: "vecino" }),
      vocabularyWord({ form: "pastel", lemma: "pastel" }),
      vocabularyWord({ form: "pan", lemma: "pan" }),
    ]),
    judge: Object.freeze({
      note: 9,
      confidence: 0.95,
      flaggedWords: Object.freeze([]),
    }),
    expectedNote: 9,
    expectedIssues: Object.freeze([]),
    expectedMetadataForms: Object.freeze(["balcón", "melón", "vecino", "pastel", "pan"]),
  }),
  Object.freeze({
    id: "overly_cultured_word",
    description: "Una palabra aprobada pero demasiado culta se señala como problema blando.",
    verses: Object.freeze([
      verse("V1", "El gato promete un regalo singular."),
      verse("V2", "Guarda un melón para su vecino leal."),
      verse("V3", "La espera se vuelve un misterio inefable."),
      verse("V4", "Y al final solo comparte un trozo de pan."),
    ]),
    dictionary: Object.freeze([
      vocabularyWord({ form: "melón", lemma: "melón" }),
      vocabularyWord({ form: "vecino", lemma: "vecino" }),
      vocabularyWord({ form: "pan", lemma: "pan" }),
      vocabularyWord({ form: "inefable", lemma: "inefable", level: "culto" }),
    ]),
    judge: Object.freeze({
      note: 3,
      confidence: 0.8,
      flaggedWords: Object.freeze([
        Object.freeze({
          slot: "V3" as const,
          form: "inefable",
          issue: "DEMASIADO_CULTO" as const,
          reason: "El adjetivo es inaccesible para lectores de 10-12 años en este uso concreto.",
          alternatives: Object.freeze(["increíble", "sorprendente"]),
        }),
      ]),
    }),
    expectedNote: 3,
    expectedIssues: Object.freeze(["DEMASIADO_CULTO"] as const),
    expectedMetadataForms: Object.freeze(["melón", "vecino", "inefable", "pan"]),
  }),
  Object.freeze({
    id: "abstract_word",
    description: "Una palabra abstracta se señala sin convertirse en ausente del diccionario.",
    verses: Object.freeze([
      verse("V1", "El gato dibuja una idea en el cuaderno."),
      verse("V2", "Guarda un melón para su vecino tierno."),
      verse("V3", "Pero el concepto no se entiende del todo."),
      verse("V4", "Y al final comparte un dibujo confuso."),
    ]),
    dictionary: Object.freeze([
      vocabularyWord({ form: "melón", lemma: "melón" }),
      vocabularyWord({ form: "vecino", lemma: "vecino" }),
      vocabularyWord({ form: "concepto", lemma: "concepto", level: "abstracto" }),
    ]),
    judge: Object.freeze({
      note: 4,
      confidence: 0.85,
      flaggedWords: Object.freeze([
        Object.freeze({
          slot: "V3" as const,
          form: "concepto",
          issue: "ABSTRACTO" as const,
          reason: "Remite a una idea abstracta que no se puede visualizar en la escena.",
          alternatives: Object.freeze(["dibujo", "plan"]),
        }),
      ]),
    }),
    expectedNote: 4,
    expectedIssues: Object.freeze(["ABSTRACTO"] as const),
    expectedMetadataForms: Object.freeze(["melón", "vecino", "concepto"]),
  }),
  Object.freeze({
    id: "infantilizing_word",
    description: "Una palabra condescendiente se distingue de una palabra clara.",
    verses: Object.freeze([
      verse("V1", "El michi promete compartir su merienda."),
      verse("V2", "Guarda un melón para su vecino de al lado."),
      verse("V3", "Se distrae y pierde toda la paciencia."),
      verse("V4", "Y al final solo comparte un triste bocado."),
    ]),
    dictionary: Object.freeze([
      vocabularyWord({ form: "michi", lemma: "michi", level: "infantil" }),
      vocabularyWord({ form: "melón", lemma: "melón" }),
      vocabularyWord({ form: "vecino", lemma: "vecino" }),
    ]),
    judge: Object.freeze({
      note: 4,
      confidence: 0.9,
      flaggedWords: Object.freeze([
        Object.freeze({
          slot: "V1" as const,
          form: "michi",
          issue: "INFANTILIZANTE" as const,
          reason: "Llamar al gato con habla de bebé rebaja a lectores de 10-12 años.",
          alternatives: Object.freeze(["gato"]),
        }),
      ]),
    }),
    expectedNote: 4,
    expectedIssues: Object.freeze(["INFANTILIZANTE"] as const),
    expectedMetadataForms: Object.freeze(["michi", "melón", "vecino"]),
  }),
  Object.freeze({
    id: "contextually_ambiguous_word",
    description: "Una palabra cotidiana pero ambigua en su uso concreto se señala.",
    verses: Object.freeze([
      verse("V1", "El gato promete cuidar su bolsa con esmero."),
      verse("V2", "Guarda un melón para su vecino sincero."),
      verse("V3", "La bolsa cae y se pierde su dinero."),
      verse("V4", "Y al final no comparte más que un agujero."),
    ]),
    dictionary: Object.freeze([
      vocabularyWord({ form: "bolsa", lemma: "bolsa" }),
      vocabularyWord({ form: "melón", lemma: "melón" }),
      vocabularyWord({ form: "vecino", lemma: "vecino" }),
    ]),
    judge: Object.freeze({
      note: 5,
      confidence: 0.75,
      flaggedWords: Object.freeze([
        Object.freeze({
          slot: "V1" as const,
          form: "bolsa",
          issue: "AMBIGUO_CONTEXTUAL" as const,
          reason: "El uso oscila entre el objeto y el mercado financiero sin aclararse.",
          alternatives: Object.freeze(["mochila", "cartera"]),
        }),
      ]),
    }),
    expectedNote: 5,
    expectedIssues: Object.freeze(["AMBIGUO_CONTEXTUAL"] as const),
    expectedMetadataForms: Object.freeze(["bolsa", "melón", "vecino", "bolsa"]),
  }),
]);

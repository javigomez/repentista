import type {
  BatchDuplicateCandidateInput,
  DuplicateClassification,
} from "./batch-duplicate-detection.js";

const BASE_VERSES = Object.freeze([
  "Un gato mira al vecino",
  "promete media ración de melón",
  "se distrae mirando el camino",
  "y solo comparte el olor a jamón",
]);

const BASE_FINAL_WORDS = Object.freeze(["vecino", "melón", "camino", "jamón"]);

const BASE_ANCHORS = Object.freeze([
  "presenta al gato",
  "promete guardar pan",
  "se distrae",
  "confiesa el remate",
]);

export function dedupCandidate(
  overrides: Partial<BatchDuplicateCandidateInput> = {},
): BatchDuplicateCandidateInput {
  return {
    id: "candidate-001",
    verses: BASE_VERSES,
    finalWords: BASE_FINAL_WORDS,
    rhymeScheme: "0-A-0-A",
    metricPositions: 7,
    semanticAnchors: BASE_ANCHORS,
    ...overrides,
  };
}

export interface BatchDuplicateDetectionExpected {
  readonly groupCount: number;
  readonly survivorCount: number;
  readonly classifications: readonly DuplicateClassification[];
  readonly canonicalIds: readonly (string | undefined)[];
}

export interface BatchDuplicateGoldFixture {
  readonly id: string;
  readonly description: string;
  readonly candidates: readonly BatchDuplicateCandidateInput[];
  readonly expected: BatchDuplicateDetectionExpected;
}

export const BATCH_DUPLICATE_GOLD_FIXTURES: readonly BatchDuplicateGoldFixture[] =
  Object.freeze([
    Object.freeze({
      id: "case_space_punctuation_equivalent_collapse",
      description:
        "Dos candidatos solo difieren en mayúsculas, espacios y puntuación no significativa y se agrupan.",
      candidates: Object.freeze([
        dedupCandidate({ id: "candidate-a" }),
        dedupCandidate({
          id: "candidate-b",
          verses: Object.freeze([
            "UN GATO MIRA AL VECINO.",
            "  promete media ración de melón",
            "se distrae, mirando el camino!",
            "y solo comparte el olor a jamón...",
          ]),
        }),
        dedupCandidate({
          id: "candidate-c",
          verses: Object.freeze([
            "Un gato mira la ventana",
            "promete media ración de melón",
            "se distrae mirando el camino",
            "y solo comparte el olor a jamón",
          ]),
        }),
      ]),
      expected: Object.freeze({
        groupCount: 2,
        survivorCount: 2,
        classifications: Object.freeze(["CANONICO", "DUPLICADO", "CANONICO"] as const),
        canonicalIds: Object.freeze([undefined, "candidate-a", undefined]),
      }),
    }),
    Object.freeze({
      id: "all_distinct_survive",
      description: "Candidatos textualmente distintos no se agrupan.",
      candidates: Object.freeze([
        dedupCandidate({
          id: "candidate-a",
          verses: Object.freeze([
            "Un gato mira al vecino",
            "promete media ración de melón",
            "se distrae mirando el camino",
            "y solo comparte el olor a jamón",
          ]),
        }),
        dedupCandidate({
          id: "candidate-b",
          verses: Object.freeze([
            "Un perro ladra al vecino",
            "promete media ración de melón",
            "se distrae mirando el camino",
            "y solo comparte el olor a jamón",
          ]),
        }),
        dedupCandidate({
          id: "candidate-c",
          verses: Object.freeze([
            "Un gato mira al vecino",
            "promete media ración de melón",
            "se distrae mirando el camino",
            "y solo comparte el olor a salmón",
          ]),
        }),
      ]),
      expected: Object.freeze({
        groupCount: 3,
        survivorCount: 3,
        classifications: Object.freeze(["CANONICO", "CANONICO", "CANONICO"] as const),
        canonicalIds: Object.freeze([undefined, undefined, undefined]),
      }),
    }),
    Object.freeze({
      id: "plan_differs_do_not_collapse",
      description:
        "El mismo texto con un plan semántico distinto permanece separado para evaluación posterior.",
      candidates: Object.freeze([
        dedupCandidate({
          id: "candidate-a",
          semanticAnchors: Object.freeze([
            "presenta al gato",
            "promete guardar pan",
            "se distrae",
            "confiesa el remate",
          ]),
        }),
        dedupCandidate({
          id: "candidate-b",
          semanticAnchors: Object.freeze([
            "presenta al perro",
            "promete guardar pan",
            "se distrae",
            "confiesa el remate",
          ]),
        }),
      ]),
      expected: Object.freeze({
        groupCount: 2,
        survivorCount: 2,
        classifications: Object.freeze(["CANONICO", "CANONICO"] as const),
        canonicalIds: Object.freeze([undefined, undefined]),
      }),
    }),
    Object.freeze({
      id: "final_word_differs_do_not_collapse",
      description:
        "El mismo texto con una palabra final planificada distinta permanece separado.",
      candidates: Object.freeze([
        dedupCandidate({
          id: "candidate-a",
          finalWords: Object.freeze(["vecino", "melón", "camino", "jamón"]),
        }),
        dedupCandidate({
          id: "candidate-b",
          finalWords: Object.freeze(["vecino", "melón", "camino", "salón"]),
        }),
      ]),
      expected: Object.freeze({
        groupCount: 2,
        survivorCount: 2,
        classifications: Object.freeze(["CANONICO", "CANONICO"] as const),
        canonicalIds: Object.freeze([undefined, undefined]),
      }),
    }),
  ]);

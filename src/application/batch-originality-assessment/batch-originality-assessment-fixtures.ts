import type { BatchOriginalityCandidateInput } from "./batch-originality-assessment.js";

/**
 * Golden corpus for batch originality assessment. The batches assume exact
 * duplicates were already collapsed by the duplicate detector: every candidate
 * here is textually distinct, but some still retell the same joke with different
 * wording and must be flagged as superficial variations.
 */

const GATO_VERSES = Object.freeze([
  "Un gato mira al vecino",
  "promete media ración de melón",
  "se distrae mirando el camino",
  "y solo comparte el olor a jamón",
]);

const GATO_FINAL_WORDS = Object.freeze(["vecino", "melón", "camino", "jamón"]);

const GATO_ANCHORS = Object.freeze([
  "presenta al gato",
  "promete guardar pan",
  "se distrae",
  "confiesa el remate",
]);

const GATO_VARIATION_VERSES = Object.freeze([
  "El gato observa al vecino",
  "le promete un trozo de melón",
  "mira distraído hacia el camino",
  "y acaba ofreciendo solo aroma a jamón",
]);

const PERRO_VERSES = Object.freeze([
  "Un perro esconde su hueso favorito",
  "promete no contarlo a nadie",
  "ladra a un mosquito distraído",
  "y entierra su cena por la tarde",
]);

const PERRO_FINAL_WORDS = Object.freeze(["favorito", "nadie", "distraído", "tarde"]);

const PERRO_ANCHORS = Object.freeze([
  "presenta al perro",
  "esconde el hueso",
  "ladra al mosquito",
  "entierra la cena",
]);

export function gatoCandidate(
  overrides: Partial<BatchOriginalityCandidateInput> = {},
): BatchOriginalityCandidateInput {
  return {
    id: "candidate-a",
    verses: GATO_VERSES,
    finalWords: GATO_FINAL_WORDS,
    rhymeScheme: "0-A-0-A",
    metricPositions: 7,
    semanticAnchors: GATO_ANCHORS,
    ...overrides,
  };
}

export function gatoVariationCandidate(
  overrides: Partial<BatchOriginalityCandidateInput> = {},
): BatchOriginalityCandidateInput {
  return gatoCandidate({
    id: "candidate-b",
    verses: GATO_VARIATION_VERSES,
    ...overrides,
  });
}

export function perroCandidate(
  overrides: Partial<BatchOriginalityCandidateInput> = {},
): BatchOriginalityCandidateInput {
  return {
    id: "candidate-c",
    verses: PERRO_VERSES,
    finalWords: PERRO_FINAL_WORDS,
    rhymeScheme: "0-A-0-A",
    metricPositions: 7,
    semanticAnchors: PERRO_ANCHORS,
    ...overrides,
  };
}

/** Three candidates with different jokes, rhyme pairs and anchors. */
export const DISTINCT_BATCH: readonly BatchOriginalityCandidateInput[] = Object.freeze([
  gatoCandidate({ id: "candidate-a" }),
  perroCandidate({ id: "candidate-b" }),
  gatoCandidate({
    id: "candidate-c",
    verses: Object.freeze([
      "El gato cierra la ventana",
      "y se esconde bajo el colchón",
      "oye truenos por la mañana",
      "y huye de su propio televisor",
    ]),
    finalWords: Object.freeze(["ventana", "colchón", "mañana", "televisor"]),
    semanticAnchors: Object.freeze([
      "cierra la ventana",
      "se esconde",
      "oye truenos",
      "huye del televisor",
    ]),
  }),
]);

/**
 * Two retellings of the same gato/jamón joke plus an unrelated candidate. The
 * first two share final words and anchors, so the evaluator must consult the
 * model to decide whether their wording is a superficial variation.
 */
export const SUPERFICIAL_VARIATION_BATCH: readonly BatchOriginalityCandidateInput[] =
  Object.freeze([
    gatoCandidate({ id: "candidate-a" }),
    gatoVariationCandidate({ id: "candidate-b" }),
    perroCandidate({ id: "candidate-c" }),
  ]);

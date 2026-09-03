import type {
  OctonolMeterFinalStressType,
  OctonolMeterVerdict,
} from "./octonol-meter.js";

export interface OctonolMeterGoldExpected {
  readonly verdict: OctonolMeterVerdict;
  readonly reasonCode?: string;
  readonly positionsToLastStress?: number;
  readonly phoneticSyllableCount?: number;
  readonly finalStressType?: OctonolMeterFinalStressType;
  readonly lastStress?: string;
  readonly segmentation?: string;
  readonly sinalefas?: readonly string[];
  readonly doubtfulSinalefas?: readonly string[];
  readonly readings?: readonly number[];
  readonly difference?: number;
}

export interface OctonolMeterGoldFixture {
  readonly id: string;
  readonly description: string;
  readonly verse: string;
  readonly expected: OctonolMeterGoldExpected;
}

export const OCTONOL_METER_GOLD_FIXTURES: readonly OctonolMeterGoldFixture[] = Object.freeze([
  Object.freeze({
    id: "valid_llana_no_sinalefa",
    description: "Verso llano con ocho sílabas fonéticas y sin sinalefa.",
    verse: "casa de la luna llena",
    expected: Object.freeze({
      verdict: "VALIDO",
      positionsToLastStress: 7,
      phoneticSyllableCount: 8,
      finalStressType: "LLANA",
      lastStress: "lle",
      segmentation: "ca-sa-de-la-lu-na-LLE-na",
      sinalefas: [],
      doubtfulSinalefas: [],
      readings: [7],
      difference: 0,
    }),
  }),
  Object.freeze({
    id: "valid_llana_natural_sinalefa",
    description: "Verso llano con una sinalefa natural autorizada.",
    verse: "la casa de agua serena",
    expected: Object.freeze({
      verdict: "VALIDO",
      positionsToLastStress: 7,
      phoneticSyllableCount: 8,
      finalStressType: "LLANA",
      lastStress: "re",
      segmentation: "la-ca-sa-de_a-gua-se-RE-na",
      sinalefas: ["de_a"],
      doubtfulSinalefas: [],
      readings: [7],
      difference: 0,
    }),
  }),
  Object.freeze({
    id: "valid_aguda",
    description: "Verso agudo con siete sílabas fonéticas.",
    verse: "el corazón de la flor",
    expected: Object.freeze({
      verdict: "VALIDO",
      positionsToLastStress: 7,
      phoneticSyllableCount: 7,
      finalStressType: "AGUDA",
      lastStress: "flor",
      segmentation: "el-co-ra-zón-de-la-FLOR",
      sinalefas: [],
      doubtfulSinalefas: [],
      readings: [7],
      difference: 0,
    }),
  }),
  Object.freeze({
    id: "invalid_short_llana",
    description: "Verso llano cuya última tónica queda antes de la posición siete.",
    verse: "casa de la luna",
    expected: Object.freeze({
      verdict: "INVALIDO",
      positionsToLastStress: 5,
      phoneticSyllableCount: 6,
      finalStressType: "LLANA",
      lastStress: "lu",
      segmentation: "ca-sa-de-la-LU-na",
      sinalefas: [],
      doubtfulSinalefas: [],
      readings: [5],
      difference: -2,
    }),
  }),
  Object.freeze({
    id: "invalid_long_llana",
    description: "Verso llano cuya última tónica queda después de la posición siete.",
    verse: "la casa de la luna llena",
    expected: Object.freeze({
      verdict: "INVALIDO",
      positionsToLastStress: 8,
      phoneticSyllableCount: 9,
      finalStressType: "LLANA",
      lastStress: "lle",
      segmentation: "la-ca-sa-de-la-lu-na-LLE-na",
      sinalefas: [],
      doubtfulSinalefas: [],
      readings: [8],
      difference: 1,
    }),
  }),
  Object.freeze({
    id: "dudoso_strong_pause",
    description: "Alcanzar siete depende de una sinalefa dudosa tras pausa fuerte.",
    verse: "la casa serena; ahora",
    expected: Object.freeze({
      verdict: "DUDOSO",
      positionsToLastStress: 8,
      phoneticSyllableCount: 9,
      finalStressType: "LLANA",
      lastStress: "ho",
      segmentation: "la-ca-sa-se-re-na-a-HO-ra",
      sinalefas: [],
      doubtfulSinalefas: ["na_a"],
      readings: [8, 7],
      difference: 1,
    }),
  }),
  Object.freeze({
    id: "invalid_esdrujula_prohibited",
    description: "Una esdrújula queda fuera de la política conservadora y se rechaza.",
    verse: "el pájaro azul vuela",
    expected: Object.freeze({
      verdict: "INVALIDO",
      reasonCode: "UNSUPPORTED_STRESS_KIND",
    }),
  }),
]);

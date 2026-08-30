export const CONSERVATIVE_SINALEFA_POLICY_VERSION = "conservative-sinalefa-0.1.0";

export type SinalefaBoundaryClassification = "APLICADA" | "NO_APLICADA" | "DUDOSA";
export type SinalefaBoundaryConfidence = "ALTA" | "MEDIA" | "BAJA";
export type FinalStressType = "AGUDA" | "LLANA";
export type PauseStrength = "SOFT" | "STRONG";
export type ProhibitedMetricLicense = "DIERESIS" | "SINERESIS" | "FORCED_HIATUS";

export interface SyllableFixture {
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface WordAnalysisFixture {
  readonly text: string;
  readonly normalized: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly syllables: readonly SyllableFixture[];
  readonly stressIndex: number;
  readonly finalStressType: FinalStressType;
}

export interface VowelEvidenceFixture {
  readonly tokenIndex: number;
  readonly syllableIndex: number;
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
}

export interface PunctuationEvidenceFixture {
  readonly text: string;
  readonly startOffset: number;
  readonly endOffset: number;
  readonly pauseStrength: PauseStrength;
}

export interface SinalefaBoundaryFixture {
  readonly leftTokenIndex: number;
  readonly rightTokenIndex: number;
  readonly classification: SinalefaBoundaryClassification;
  readonly ruleId: string;
  readonly reason: string;
  readonly confidence: SinalefaBoundaryConfidence;
  readonly leftVowel: VowelEvidenceFixture;
  readonly rightVowel: VowelEvidenceFixture;
  readonly punctuationBetween: readonly PunctuationEvidenceFixture[];
  readonly affectedSyllables: readonly [SyllableFixture, SyllableFixture];
}

export interface ConservativeSinalefaFixture {
  readonly id: string;
  readonly description: string;
  readonly verse: string;
  readonly policyVersion: typeof CONSERVATIVE_SINALEFA_POLICY_VERSION;
  readonly tokens: readonly WordAnalysisFixture[];
  readonly expectedBoundaries: readonly SinalefaBoundaryFixture[];
}

export interface ConservativeSinalefaProhibitedLicenseFixture extends ConservativeSinalefaFixture {
  readonly prohibitedLicense: ProhibitedMetricLicense;
  readonly preservedSyllablesByToken: readonly (readonly string[])[];
}

export const CONSERVATIVE_SINALEFA_BOUNDARY_FIXTURES = [
  {
    id: "natural_hache_vowel_join",
    description: "Natural sinalefa crosses silent h without intervening pause.",
    verse: "llega humo",
    policyVersion: CONSERVATIVE_SINALEFA_POLICY_VERSION,
    tokens: [
      {
        text: "llega",
        normalized: "llega",
        startOffset: 0,
        endOffset: 5,
        syllables: [
          { text: "lle", startOffset: 0, endOffset: 3 },
          { text: "ga", startOffset: 3, endOffset: 5 },
        ],
        stressIndex: 0,
        finalStressType: "LLANA",
      },
      {
        text: "humo",
        normalized: "humo",
        startOffset: 6,
        endOffset: 10,
        syllables: [
          { text: "hu", startOffset: 6, endOffset: 8 },
          { text: "mo", startOffset: 8, endOffset: 10 },
        ],
        stressIndex: 0,
        finalStressType: "LLANA",
      },
    ],
    expectedBoundaries: [
      {
        leftTokenIndex: 0,
        rightTokenIndex: 1,
        classification: "APLICADA",
        ruleId: "natural-final-initial-vowel/v1",
        reason: "final vowel joins initial h plus vowel without pause",
        confidence: "ALTA",
        leftVowel: { tokenIndex: 0, syllableIndex: 1, text: "a", startOffset: 4, endOffset: 5 },
        rightVowel: { tokenIndex: 1, syllableIndex: 0, text: "u", startOffset: 7, endOffset: 8 },
        punctuationBetween: [],
        affectedSyllables: [
          { text: "ga", startOffset: 3, endOffset: 5 },
          { text: "hu", startOffset: 6, endOffset: 8 },
        ],
      },
    ],
  },
  {
    id: "natural_conjunction_y_vowel_sound",
    description: "The conjunction y is preserved as its own token and vowel-sound evidence.",
    verse: "va y vuelve",
    policyVersion: CONSERVATIVE_SINALEFA_POLICY_VERSION,
    tokens: [
      {
        text: "va",
        normalized: "va",
        startOffset: 0,
        endOffset: 2,
        syllables: [{ text: "va", startOffset: 0, endOffset: 2 }],
        stressIndex: 0,
        finalStressType: "AGUDA",
      },
      {
        text: "y",
        normalized: "y",
        startOffset: 3,
        endOffset: 4,
        syllables: [{ text: "y", startOffset: 3, endOffset: 4 }],
        stressIndex: 0,
        finalStressType: "AGUDA",
      },
      {
        text: "vuelve",
        normalized: "vuelve",
        startOffset: 5,
        endOffset: 11,
        syllables: [
          { text: "vuel", startOffset: 5, endOffset: 9 },
          { text: "ve", startOffset: 9, endOffset: 11 },
        ],
        stressIndex: 0,
        finalStressType: "LLANA",
      },
    ],
    expectedBoundaries: [
      {
        leftTokenIndex: 0,
        rightTokenIndex: 1,
        classification: "APLICADA",
        ruleId: "conjunction-y-vowel-sound/v1",
        reason: "final vowel joins conjunction y when no pause intervenes",
        confidence: "ALTA",
        leftVowel: { tokenIndex: 0, syllableIndex: 0, text: "a", startOffset: 1, endOffset: 2 },
        rightVowel: { tokenIndex: 1, syllableIndex: 0, text: "y", startOffset: 3, endOffset: 4 },
        punctuationBetween: [],
        affectedSyllables: [
          { text: "va", startOffset: 0, endOffset: 2 },
          { text: "y", startOffset: 3, endOffset: 4 },
        ],
      },
    ],
  },
  {
    id: "comma_blocks_vowel_join",
    description: "A comma between adjacent vowel sounds blocks automatic application.",
    verse: "llega, ahora",
    policyVersion: CONSERVATIVE_SINALEFA_POLICY_VERSION,
    tokens: [
      {
        text: "llega",
        normalized: "llega",
        startOffset: 0,
        endOffset: 5,
        syllables: [
          { text: "lle", startOffset: 0, endOffset: 3 },
          { text: "ga", startOffset: 3, endOffset: 5 },
        ],
        stressIndex: 0,
        finalStressType: "LLANA",
      },
      {
        text: "ahora",
        normalized: "ahora",
        startOffset: 7,
        endOffset: 12,
        syllables: [
          { text: "a", startOffset: 7, endOffset: 8 },
          { text: "ho", startOffset: 8, endOffset: 10 },
          { text: "ra", startOffset: 10, endOffset: 12 },
        ],
        stressIndex: 1,
        finalStressType: "LLANA",
      },
    ],
    expectedBoundaries: [
      {
        leftTokenIndex: 0,
        rightTokenIndex: 1,
        classification: "NO_APLICADA",
        ruleId: "soft-punctuation-blocks-natural-join/v1",
        reason: "comma preserves an editorial pause between vowel sounds",
        confidence: "ALTA",
        leftVowel: { tokenIndex: 0, syllableIndex: 1, text: "a", startOffset: 4, endOffset: 5 },
        rightVowel: { tokenIndex: 1, syllableIndex: 0, text: "a", startOffset: 7, endOffset: 8 },
        punctuationBetween: [{ text: ",", startOffset: 5, endOffset: 6, pauseStrength: "SOFT" }],
        affectedSyllables: [
          { text: "ga", startOffset: 3, endOffset: 5 },
          { text: "a", startOffset: 7, endOffset: 8 },
        ],
      },
    ],
  },
  {
    id: "strong_pause_is_doubtful",
    description: "A strong pause leaves the boundary doubtful instead of silently joining it.",
    verse: "llega; ahora",
    policyVersion: CONSERVATIVE_SINALEFA_POLICY_VERSION,
    tokens: [
      {
        text: "llega",
        normalized: "llega",
        startOffset: 0,
        endOffset: 5,
        syllables: [
          { text: "lle", startOffset: 0, endOffset: 3 },
          { text: "ga", startOffset: 3, endOffset: 5 },
        ],
        stressIndex: 0,
        finalStressType: "LLANA",
      },
      {
        text: "ahora",
        normalized: "ahora",
        startOffset: 7,
        endOffset: 12,
        syllables: [
          { text: "a", startOffset: 7, endOffset: 8 },
          { text: "ho", startOffset: 8, endOffset: 10 },
          { text: "ra", startOffset: 10, endOffset: 12 },
        ],
        stressIndex: 1,
        finalStressType: "LLANA",
      },
    ],
    expectedBoundaries: [
      {
        leftTokenIndex: 0,
        rightTokenIndex: 1,
        classification: "DUDOSA",
        ruleId: "strong-punctuation-requires-editorial-review/v1",
        reason: "strong pause cannot be used as a silent metric reduction",
        confidence: "BAJA",
        leftVowel: { tokenIndex: 0, syllableIndex: 1, text: "a", startOffset: 4, endOffset: 5 },
        rightVowel: { tokenIndex: 1, syllableIndex: 0, text: "a", startOffset: 7, endOffset: 8 },
        punctuationBetween: [{ text: ";", startOffset: 5, endOffset: 6, pauseStrength: "STRONG" }],
        affectedSyllables: [
          { text: "ga", startOffset: 3, endOffset: 5 },
          { text: "a", startOffset: 7, endOffset: 8 },
        ],
      },
    ],
  },
  {
    id: "multiple_boundaries_keep_doubt_explicit",
    description: "A verse with several boundaries keeps the doubtful strong-pause case in the trace.",
    verse: "llega ahora; otra",
    policyVersion: CONSERVATIVE_SINALEFA_POLICY_VERSION,
    tokens: [
      {
        text: "llega",
        normalized: "llega",
        startOffset: 0,
        endOffset: 5,
        syllables: [
          { text: "lle", startOffset: 0, endOffset: 3 },
          { text: "ga", startOffset: 3, endOffset: 5 },
        ],
        stressIndex: 0,
        finalStressType: "LLANA",
      },
      {
        text: "ahora",
        normalized: "ahora",
        startOffset: 6,
        endOffset: 11,
        syllables: [
          { text: "a", startOffset: 6, endOffset: 7 },
          { text: "ho", startOffset: 7, endOffset: 9 },
          { text: "ra", startOffset: 9, endOffset: 11 },
        ],
        stressIndex: 1,
        finalStressType: "LLANA",
      },
      {
        text: "otra",
        normalized: "otra",
        startOffset: 13,
        endOffset: 17,
        syllables: [
          { text: "o", startOffset: 13, endOffset: 14 },
          { text: "tra", startOffset: 14, endOffset: 17 },
        ],
        stressIndex: 0,
        finalStressType: "LLANA",
      },
    ],
    expectedBoundaries: [
      {
        leftTokenIndex: 0,
        rightTokenIndex: 1,
        classification: "APLICADA",
        ruleId: "natural-final-initial-vowel/v1",
        reason: "natural adjacent vowel sounds join when no pause intervenes",
        confidence: "ALTA",
        leftVowel: { tokenIndex: 0, syllableIndex: 1, text: "a", startOffset: 4, endOffset: 5 },
        rightVowel: { tokenIndex: 1, syllableIndex: 0, text: "a", startOffset: 6, endOffset: 7 },
        punctuationBetween: [],
        affectedSyllables: [
          { text: "ga", startOffset: 3, endOffset: 5 },
          { text: "a", startOffset: 6, endOffset: 7 },
        ],
      },
      {
        leftTokenIndex: 1,
        rightTokenIndex: 2,
        classification: "DUDOSA",
        ruleId: "strong-punctuation-requires-editorial-review/v1",
        reason: "strong pause cannot be used as a silent metric reduction",
        confidence: "BAJA",
        leftVowel: { tokenIndex: 1, syllableIndex: 2, text: "a", startOffset: 10, endOffset: 11 },
        rightVowel: { tokenIndex: 2, syllableIndex: 0, text: "o", startOffset: 13, endOffset: 14 },
        punctuationBetween: [{ text: ";", startOffset: 11, endOffset: 12, pauseStrength: "STRONG" }],
        affectedSyllables: [
          { text: "ra", startOffset: 9, endOffset: 11 },
          { text: "o", startOffset: 13, endOffset: 14 },
        ],
      },
    ],
  },
] as const satisfies readonly ConservativeSinalefaFixture[];

export const CONSERVATIVE_SINALEFA_PROHIBITED_LICENSE_FIXTURES = [
  {
    id: "dieresis_is_not_created_inside_diphthong",
    description: "A lexical diphthong is preserved; the detector may only evaluate the word boundary.",
    verse: "suave ahora",
    policyVersion: CONSERVATIVE_SINALEFA_POLICY_VERSION,
    prohibitedLicense: "DIERESIS",
    preservedSyllablesByToken: [
      ["sua", "ve"],
      ["a", "ho", "ra"],
    ],
    tokens: [
      {
        text: "suave",
        normalized: "suave",
        startOffset: 0,
        endOffset: 5,
        syllables: [
          { text: "sua", startOffset: 0, endOffset: 3 },
          { text: "ve", startOffset: 3, endOffset: 5 },
        ],
        stressIndex: 0,
        finalStressType: "LLANA",
      },
      {
        text: "ahora",
        normalized: "ahora",
        startOffset: 6,
        endOffset: 11,
        syllables: [
          { text: "a", startOffset: 6, endOffset: 7 },
          { text: "ho", startOffset: 7, endOffset: 9 },
          { text: "ra", startOffset: 9, endOffset: 11 },
        ],
        stressIndex: 1,
        finalStressType: "LLANA",
      },
    ],
    expectedBoundaries: [
      {
        leftTokenIndex: 0,
        rightTokenIndex: 1,
        classification: "APLICADA",
        ruleId: "natural-final-initial-vowel/v1",
        reason: "final vowel joins initial vowel without altering lexical diphthongs",
        confidence: "ALTA",
        leftVowel: { tokenIndex: 0, syllableIndex: 1, text: "e", startOffset: 4, endOffset: 5 },
        rightVowel: { tokenIndex: 1, syllableIndex: 0, text: "a", startOffset: 6, endOffset: 7 },
        punctuationBetween: [],
        affectedSyllables: [
          { text: "ve", startOffset: 3, endOffset: 5 },
          { text: "a", startOffset: 6, endOffset: 7 },
        ],
      },
    ],
  },
  {
    id: "sineresis_is_not_created_inside_hiatus",
    description: "A lexical hiatus is preserved; internal syllables are not merged to force a reduction.",
    verse: "poeta amable",
    policyVersion: CONSERVATIVE_SINALEFA_POLICY_VERSION,
    prohibitedLicense: "SINERESIS",
    preservedSyllablesByToken: [
      ["po", "e", "ta"],
      ["a", "ma", "ble"],
    ],
    tokens: [
      {
        text: "poeta",
        normalized: "poeta",
        startOffset: 0,
        endOffset: 5,
        syllables: [
          { text: "po", startOffset: 0, endOffset: 2 },
          { text: "e", startOffset: 2, endOffset: 3 },
          { text: "ta", startOffset: 3, endOffset: 5 },
        ],
        stressIndex: 1,
        finalStressType: "LLANA",
      },
      {
        text: "amable",
        normalized: "amable",
        startOffset: 6,
        endOffset: 12,
        syllables: [
          { text: "a", startOffset: 6, endOffset: 7 },
          { text: "ma", startOffset: 7, endOffset: 9 },
          { text: "ble", startOffset: 9, endOffset: 12 },
        ],
        stressIndex: 1,
        finalStressType: "LLANA",
      },
    ],
    expectedBoundaries: [
      {
        leftTokenIndex: 0,
        rightTokenIndex: 1,
        classification: "APLICADA",
        ruleId: "natural-final-initial-vowel/v1",
        reason: "final vowel joins initial vowel without merging lexical hiatuses",
        confidence: "ALTA",
        leftVowel: { tokenIndex: 0, syllableIndex: 2, text: "a", startOffset: 4, endOffset: 5 },
        rightVowel: { tokenIndex: 1, syllableIndex: 0, text: "a", startOffset: 6, endOffset: 7 },
        punctuationBetween: [],
        affectedSyllables: [
          { text: "ta", startOffset: 3, endOffset: 5 },
          { text: "a", startOffset: 6, endOffset: 7 },
        ],
      },
    ],
  },
  {
    id: "forced_hiatus_is_not_inserted_at_natural_boundary",
    description: "A natural vowel boundary without pause is applied instead of inventing a hiatus.",
    verse: "llega ahora",
    policyVersion: CONSERVATIVE_SINALEFA_POLICY_VERSION,
    prohibitedLicense: "FORCED_HIATUS",
    preservedSyllablesByToken: [
      ["lle", "ga"],
      ["a", "ho", "ra"],
    ],
    tokens: [
      {
        text: "llega",
        normalized: "llega",
        startOffset: 0,
        endOffset: 5,
        syllables: [
          { text: "lle", startOffset: 0, endOffset: 3 },
          { text: "ga", startOffset: 3, endOffset: 5 },
        ],
        stressIndex: 0,
        finalStressType: "LLANA",
      },
      {
        text: "ahora",
        normalized: "ahora",
        startOffset: 6,
        endOffset: 11,
        syllables: [
          { text: "a", startOffset: 6, endOffset: 7 },
          { text: "ho", startOffset: 7, endOffset: 9 },
          { text: "ra", startOffset: 9, endOffset: 11 },
        ],
        stressIndex: 1,
        finalStressType: "LLANA",
      },
    ],
    expectedBoundaries: [
      {
        leftTokenIndex: 0,
        rightTokenIndex: 1,
        classification: "APLICADA",
        ruleId: "natural-final-initial-vowel/v1",
        reason: "natural adjacent vowel sounds join when no pause intervenes",
        confidence: "ALTA",
        leftVowel: { tokenIndex: 0, syllableIndex: 1, text: "a", startOffset: 4, endOffset: 5 },
        rightVowel: { tokenIndex: 1, syllableIndex: 0, text: "a", startOffset: 6, endOffset: 7 },
        punctuationBetween: [],
        affectedSyllables: [
          { text: "ga", startOffset: 3, endOffset: 5 },
          { text: "a", startOffset: 6, endOffset: 7 },
        ],
      },
    ],
  },
] as const satisfies readonly ConservativeSinalefaProhibitedLicenseFixture[];

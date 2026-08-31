import test from "node:test";
import assert from "node:assert/strict";

import {
  CONSERVATIVE_SINALEFA_BOUNDARY_FIXTURES,
  CONSERVATIVE_SINALEFA_POLICY_VERSION,
  CONSERVATIVE_SINALEFA_PROHIBITED_LICENSE_FIXTURES,
  type SinalefaBoundaryFixture,
  type SinalefaBoundaryClassification,
} from "./conservative-sinalefa-fixtures.js";
import { detectConservativeSinalefaBoundaries } from "./conservative-sinalefa.js";

interface ComparableBoundary {
  readonly leftTokenIndex: number;
  readonly rightTokenIndex: number;
  readonly classification: SinalefaBoundaryClassification;
  readonly ruleId: string;
  readonly confidence: string;
  readonly leftVowel: SinalefaBoundaryFixture["leftVowel"];
  readonly rightVowel: SinalefaBoundaryFixture["rightVowel"];
  readonly punctuationBetween: SinalefaBoundaryFixture["punctuationBetween"];
  readonly affectedSyllables: SinalefaBoundaryFixture["affectedSyllables"];
}

const comparableBoundary = (boundary: SinalefaBoundaryFixture): ComparableBoundary => ({
  leftTokenIndex: boundary.leftTokenIndex,
  rightTokenIndex: boundary.rightTokenIndex,
  classification: boundary.classification,
  ruleId: boundary.ruleId,
  confidence: boundary.confidence,
  leftVowel: boundary.leftVowel,
  rightVowel: boundary.rightVowel,
  punctuationBetween: boundary.punctuationBetween,
  affectedSyllables: boundary.affectedSyllables,
});

test("conservative sinalefa fixtures cover applied, blocked and doubtful boundaries", () => {
  const classifications = new Set<SinalefaBoundaryClassification>();

  for (const fixture of CONSERVATIVE_SINALEFA_BOUNDARY_FIXTURES) {
    for (const boundary of fixture.expectedBoundaries) {
      classifications.add(boundary.classification);
    }
  }

  assert.deepEqual(classifications, new Set(["APLICADA", "NO_APLICADA", "DUDOSA"]));
});

test("conservative sinalefa fixtures carry versioned evidence for every boundary", () => {
  for (const fixture of CONSERVATIVE_SINALEFA_BOUNDARY_FIXTURES) {
    assert.equal(fixture.policyVersion, CONSERVATIVE_SINALEFA_POLICY_VERSION, fixture.id);
    assert.ok(fixture.tokens.length >= 2, fixture.id);
    assert.ok(fixture.expectedBoundaries.length >= 1, fixture.id);

    for (const boundary of fixture.expectedBoundaries) {
      assert.match(boundary.ruleId, /\/v\d+$/u, fixture.id);
      assert.notEqual(boundary.reason.trim(), "", fixture.id);
      assert.ok(boundary.leftTokenIndex < boundary.rightTokenIndex, fixture.id);
      assert.equal(boundary.leftVowel.tokenIndex, boundary.leftTokenIndex, fixture.id);
      assert.equal(boundary.rightVowel.tokenIndex, boundary.rightTokenIndex, fixture.id);
      assert.equal(boundary.affectedSyllables.length, 2, fixture.id);
    }
  }
});

test("conservative sinalefa fixture offsets resolve to the original verse text", () => {
  for (const fixture of CONSERVATIVE_SINALEFA_BOUNDARY_FIXTURES) {
    for (const token of fixture.tokens) {
      assert.equal(fixture.verse.slice(token.startOffset, token.endOffset), token.text, fixture.id);
      assert.ok(token.stressIndex >= 0 && token.stressIndex < token.syllables.length, fixture.id);

      for (const syllable of token.syllables) {
        assert.equal(
          fixture.verse.slice(syllable.startOffset, syllable.endOffset),
          syllable.text,
          fixture.id,
        );
      }
    }

    for (const boundary of fixture.expectedBoundaries) {
      assert.equal(
        fixture.verse.slice(boundary.leftVowel.startOffset, boundary.leftVowel.endOffset),
        boundary.leftVowel.text,
        fixture.id,
      );
      assert.equal(
        fixture.verse.slice(boundary.rightVowel.startOffset, boundary.rightVowel.endOffset),
        boundary.rightVowel.text,
        fixture.id,
      );

      for (const punctuation of boundary.punctuationBetween) {
        assert.equal(
          fixture.verse.slice(punctuation.startOffset, punctuation.endOffset),
          punctuation.text,
          fixture.id,
        );
      }
    }
  }
});

test("conservative sinalefa fixtures include punctuation and silent-h edge cases", () => {
  const fixtureIds = CONSERVATIVE_SINALEFA_BOUNDARY_FIXTURES.map((fixture) => fixture.id);
  const punctuationMarks = new Set<string>();
  const pauseStrengths = new Set<string>();

  for (const fixture of CONSERVATIVE_SINALEFA_BOUNDARY_FIXTURES) {
    for (const boundary of fixture.expectedBoundaries) {
      for (const punctuation of boundary.punctuationBetween) {
        punctuationMarks.add(punctuation.text);
        pauseStrengths.add(`${punctuation.text}:${punctuation.pauseStrength}`);
      }
    }
  }

  assert.ok(fixtureIds.includes("natural_hache_vowel_join"));
  assert.ok(punctuationMarks.has(","));
  assert.ok(pauseStrengths.has(",:SOFT"));
  assert.ok(pauseStrengths.has(";:STRONG"));
});

test("detector classifies fixture boundaries with versioned evidence", () => {
  for (const fixture of CONSERVATIVE_SINALEFA_BOUNDARY_FIXTURES) {
    const result = detectConservativeSinalefaBoundaries({
      policyVersion: CONSERVATIVE_SINALEFA_POLICY_VERSION,
      tokens: fixture.tokens,
      verse: fixture.verse,
    });

    assert.equal(result.policyVersion, fixture.policyVersion, fixture.id);
    assert.deepEqual(
      result.boundaries.map(comparableBoundary),
      fixture.expectedBoundaries.map(comparableBoundary),
      fixture.id,
    );

    for (const boundary of result.boundaries) {
      assert.match(boundary.ruleId, /\/v\d+$/u, fixture.id);
      assert.notEqual(boundary.reason.trim(), "", fixture.id);
      assert.equal(boundary.affectedSyllables.length, 2, fixture.id);
    }
  }
});

test("conservative sinalefa fixtures cover every prohibited metric license", () => {
  assert.deepEqual(
    new Set(
      CONSERVATIVE_SINALEFA_PROHIBITED_LICENSE_FIXTURES.map(
        (fixture) => fixture.prohibitedLicense,
      ),
    ),
    new Set(["DIERESIS", "SINERESIS", "FORCED_HIATUS"]),
  );
});

test("detector does not introduce dieresis, sineresis or forced hiatus", () => {
  for (const fixture of CONSERVATIVE_SINALEFA_PROHIBITED_LICENSE_FIXTURES) {
    const result = detectConservativeSinalefaBoundaries({
      policyVersion: CONSERVATIVE_SINALEFA_POLICY_VERSION,
      tokens: fixture.tokens,
      verse: fixture.verse,
    });

    assert.equal(result.policyVersion, fixture.policyVersion, fixture.id);
    assert.deepEqual(
      result.tokens.map((token) => token.syllables.map((syllable) => syllable.text)),
      fixture.preservedSyllablesByToken,
      fixture.id,
    );
    assert.deepEqual(
      result.boundaries.map(comparableBoundary),
      fixture.expectedBoundaries.map(comparableBoundary),
      fixture.id,
    );
    assert.equal(
      result.boundaries.some((boundary) => boundary.classification === "DUDOSA"),
      false,
      fixture.id,
    );
  }
});

test("detector aggregates confidence without hiding doubtful boundaries", () => {
  const fixture = CONSERVATIVE_SINALEFA_BOUNDARY_FIXTURES.find(
    (candidate) => candidate.id === "multiple_boundaries_keep_doubt_explicit",
  );
  assert.ok(fixture);

  const result = detectConservativeSinalefaBoundaries({
    policyVersion: CONSERVATIVE_SINALEFA_POLICY_VERSION,
    tokens: fixture.tokens,
    verse: fixture.verse,
  });

  assert.equal(result.confidence, "BAJA");
  assert.deepEqual(result.summary, {
    appliedCount: 1,
    notAppliedCount: 0,
    doubtfulCount: 1,
  });
  assert.equal(
    result.boundaries.some((boundary) => boundary.classification === "DUDOSA"),
    true,
  );
});

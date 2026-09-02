import test from "node:test";
import assert from "node:assert/strict";

import {
  BATCH_DUPLICATE_GOLD_FIXTURES,
  dedupCandidate,
} from "./batch-duplicate-detection-fixtures.js";
import {
  BATCH_DUPLICATE_CANONICALIZATION_VERSION,
  BATCH_DUPLICATE_DETECTOR_NAME,
  BATCH_DUPLICATE_DETECTOR_VERSION,
  buildCandidateSignature,
  createBatchDuplicateDetector,
  normalizeCandidateIdentity,
  normalizeDedupText,
  type BatchDuplicateDetectionResult,
} from "./batch-duplicate-detection.js";

const detector = createBatchDuplicateDetector();

function detectFixture(
  fixture: (typeof BATCH_DUPLICATE_GOLD_FIXTURES)[number],
): BatchDuplicateDetectionResult {
  return detector.detect(fixture.candidates);
}

test("batch duplicate gold fixtures group equivalent and distinct candidates as expected", () => {
  for (const fixture of BATCH_DUPLICATE_GOLD_FIXTURES) {
    const result = detectFixture(fixture);

    assert.equal(result.groupCount, fixture.expected.groupCount, fixture.id);
    assert.equal(result.survivorCount, fixture.expected.survivorCount, fixture.id);
    assert.deepEqual(
      result.markers.map((marker) => marker.classification),
      fixture.expected.classifications,
      fixture.id,
    );
    assert.deepEqual(
      result.markers.map((marker) => marker.canonicalId),
      fixture.expected.canonicalIds,
      fixture.id,
    );
  }
});

test("gold fixtures cover both classifications and non-trivial grouping", () => {
  const classifications = new Set<string>();

  for (const fixture of BATCH_DUPLICATE_GOLD_FIXTURES) {
    for (const marker of detectFixture(fixture).markers) {
      classifications.add(marker.classification);
    }
  }

  assert.deepEqual(classifications, new Set(["CANONICO", "DUPLICADO"]));
});

test("the detector keeps every candidate and never deletes history", () => {
  const fixture = BATCH_DUPLICATE_GOLD_FIXTURES[0];
  assert.ok(fixture, "expected a fixture with duplicates");

  const result = detectFixture(fixture);

  assert.equal(result.markers.length, fixture.candidates.length);
  assert.equal(result.totalCandidates, fixture.candidates.length);
});

test("duplicate markers reference their canonical by id and preserve input order", () => {
  const result = detector.detect([
    dedupCandidate({ id: "candidate-a" }),
    dedupCandidate({
      id: "candidate-b",
      verses: [
        "Un perro ladra al vecino",
        "promete media ración de melón",
        "se distrae mirando el camino",
        "y solo comparte el olor a jamón",
      ],
    }),
    dedupCandidate({
      id: "candidate-c",
      verses: [
        "UN GATO MIRA AL VECINO.",
        "promete media ración de melón",
        "se distrae, mirando el camino!",
        "y solo comparte el olor a jamón...",
      ],
    }),
  ]);

  assert.deepEqual(
    result.markers.map((marker) => marker.candidateId),
    ["candidate-a", "candidate-b", "candidate-c"],
  );

  const duplicate = result.markers.find((marker) => marker.classification === "DUPLICADO");

  assert.equal(duplicate?.candidateId, "candidate-c");
  assert.equal(duplicate?.canonicalId, "candidate-a");
});

test("detection is deterministic across repeated runs with the same version", () => {
  const candidates = [
    dedupCandidate({ id: "candidate-a" }),
    dedupCandidate({ id: "candidate-b" }),
    dedupCandidate({
      id: "candidate-c",
      verses: ["un gato mira al vecino", "promete media ración de melón", "se distrae mirando el camino", "y solo comparte el olor a jamón"],
    }),
    dedupCandidate({ id: "candidate-d" }),
  ];

  const first = detector.detect(candidates);
  const second = detector.detect(candidates);

  assert.deepEqual(first, second);
  assert.equal(first.version, BATCH_DUPLICATE_DETECTOR_VERSION);
  assert.equal(first.canonicalizationVersion, BATCH_DUPLICATE_CANONICALIZATION_VERSION);
});

test("results serialize losslessly with canonical links intact", () => {
  const result = detectFixture(BATCH_DUPLICATE_GOLD_FIXTURES[0]);
  const roundTripped = JSON.parse(JSON.stringify(result)) as BatchDuplicateDetectionResult;

  assert.deepEqual(roundTripped, result);

  const duplicate = roundTripped.markers.find(
    (marker) => marker.classification === "DUPLICADO",
  );
  assert.equal(duplicate?.canonicalId, "candidate-a");
  assert.equal(typeof duplicate?.canonicalId, "string");
});

test("an empty batch yields no groups and no survivors", () => {
  const result = detector.detect([]);

  assert.equal(result.totalCandidates, 0);
  assert.equal(result.groupCount, 0);
  assert.equal(result.survivorCount, 0);
  assert.deepEqual(result.groups, []);
  assert.deepEqual(result.markers, []);
});

test("normalization lowercases, strips non-significant punctuation and collapses whitespace", () => {
  assert.equal(
    normalizeDedupText("  EL Corazón, De La Flor.  "),
    "el corazón de la flor",
  );
  assert.equal(
    normalizeDedupText("¿Qué... pasa, amigo? ¡Nada!"),
    "qué pasa amigo nada",
  );
  assert.equal(normalizeDedupText("   "), "");
});

test("normalization preserves accented and composed letters", () => {
  assert.equal(normalizeDedupText("Águila Ñandú"), "águila ñandú");
  assert.equal(normalizeDedupText("café"), "café");

  const decomposed = "cafe\u0301";
  assert.equal(decomposed.normalize("NFC"), "café");
  assert.equal(normalizeDedupText(decomposed), "café");
});

test("signatures embed the canonicalization version and normalized identity", () => {
  const candidate = dedupCandidate({ id: "candidate-a" });
  const identity = normalizeCandidateIdentity(candidate);

  const signature = buildCandidateSignature(identity, BATCH_DUPLICATE_CANONICALIZATION_VERSION);

  assert.equal(
    signature,
    JSON.stringify({
      canonicalizationVersion: BATCH_DUPLICATE_CANONICALIZATION_VERSION,
      verses: identity.verses,
      finalWords: identity.finalWords,
      semanticAnchors: identity.semanticAnchors,
      rhymeScheme: identity.rhymeScheme,
      metricPositions: identity.metricPositions,
    }),
  );

  assert.equal(detector.name, BATCH_DUPLICATE_DETECTOR_NAME);
});

import test from "node:test";
import assert from "node:assert/strict";

import {
  rankDiverseFinalists,
  type RankedCandidateInput,
} from "./diverse-finalist-ranking.js";

const candidate = (id: string, score: number): RankedCandidateInput => ({
  id,
  score,
  scoreBreakdown: [{ dimension: "humor", points: score, maximum: 100 }],
  similarityToSelected: [],
});

test("filters below threshold, orders by score, and caps top-K", () => {
  const result = rankDiverseFinalists({
    candidates: [candidate("low", 79), candidate("third", 85), candidate("best", 95), candidate("second", 90)],
    threshold: 80,
    limit: 2,
    minimumDiversity: 0,
  });

  assert.deepEqual(result.finalists.map((item) => item.candidateId), ["best", "second"]);
  assert.equal(result.finalists.length, 2);
  assert.equal(result.excluded.find((item) => item.candidateId === "low")?.reasonCode, "BELOW_THRESHOLD");
});

test("uses dimension scores and then stable id for deterministic ties", () => {
  const input = [candidate("zeta", 90), candidate("alpha", 90)];
  const first = rankDiverseFinalists({ candidates: input, threshold: 80, limit: 2, minimumDiversity: 0 });
  const second = rankDiverseFinalists({ candidates: [...input].reverse(), threshold: 80, limit: 2, minimumDiversity: 0 });

  assert.deepEqual(first.finalists.map((item) => item.candidateId), ["alpha", "zeta"]);
  assert.deepEqual(first, second);
});

test("skips a high-score redundant candidate and reports its penalty", () => {
  const result = rankDiverseFinalists({
    candidates: [
      candidate("best", 98),
      { ...candidate("variant", 97), similarityToSelected: [{ candidateId: "best", similarity: 0.9, sharedFeatures: ["misma imagen"] }] },
      candidate("distinct", 90),
    ],
    threshold: 80,
    limit: 2,
    minimumDiversity: 0.8,
  });

  assert.deepEqual(result.finalists.map((item) => item.candidateId), ["best", "distinct"]);
  assert.equal(result.excluded.find((item) => item.candidateId === "variant")?.reasonCode, "REDUNDANT");
  assert.equal(result.excluded.find((item) => item.candidateId === "variant")?.similarityPenalty, 0.9);
});

test("returns a deficit instead of filling the result with ineligible candidates", () => {
  const result = rankDiverseFinalists({ candidates: [candidate("only", 81), candidate("bad", 79)], threshold: 80, limit: 5, minimumDiversity: 0 });

  assert.deepEqual(result.finalists.map((item) => item.candidateId), ["only"]);
  assert.equal(result.deficit, 4);
});

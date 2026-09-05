import test from "node:test";
import assert from "node:assert/strict";

import {
  createGenerationBrief,
  type GenerationBriefInput,
} from "./generation-brief/index.js";

test("normalizes a valid generation brief with explicit options", () => {
  const input: GenerationBriefInput = {
    context: "El egoísmo te hará perder las amistades",
    tone: "humorístico",
    candidateCount: 120,
    topK: 8,
    minimumScore: 75,
  };

  const result = createGenerationBrief(input);

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.value, {
    context: "El egoísmo te hará perder las amistades",
    tone: "humorístico",
    candidateCount: 120,
    topK: 8,
    minimumScore: 75,
    scheme: "0-A-0-A",
    rhyme: "consonant",
    metricPositions: 7,
    verseRetryBudget: 3,
    llmCallBudget: 200,
  });
});

test("applies versioned defaults and returns an immutable brief", () => {
  const result = createGenerationBrief({
    context: "Compartir conserva la amistad",
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.deepEqual(result.value, {
    context: "Compartir conserva la amistad",
    tone: "",
    candidateCount: 100,
    topK: 5,
    minimumScore: 80,
    scheme: "0-A-0-A",
    rhyme: "consonant",
    metricPositions: 7,
    verseRetryBudget: 3,
    llmCallBudget: 200,
  });
  assert.equal(Object.isFrozen(result.value), true);
});

test("reports every invalid field instead of stopping at the first error", () => {
  const input: GenerationBriefInput = {
    context: "   ",
    tone: "   ",
    candidateCount: 0,
    topK: 0,
    minimumScore: 101,
    scheme: "ABAB",
    rhyme: "assonant",
    metricPositions: 8,
  };

  const result = createGenerationBrief(input);

  assert.equal(result.ok, false);
  if (result.ok) return;

  assert.deepEqual(
    result.errors.map((error) => error.field),
    [
      "context",
      "tone",
      "candidateCount",
      "topK",
      "minimumScore",
      "scheme",
      "rhyme",
      "metricPositions",
    ],
  );
  assert.equal(
    result.errors.find((error) => error.field === "scheme")?.code,
    "UNSUPPORTED_SCHEME",
  );
  assert.equal(
    result.errors.find((error) => error.field === "rhyme")?.code,
    "UNSUPPORTED_RHYME",
  );
  assert.equal(
    result.errors.find((error) => error.field === "metricPositions")?.code,
    "UNSUPPORTED_METRIC",
  );
});

test("rejects other poetic forms even when the context is valid", () => {
  const cases: readonly [string, GenerationBriefInput, string][] = [
    ["ABAB", { context: "Un tema", scheme: "ABAB" }, "scheme"],
    ["soneto", { context: "Un tema", scheme: "soneto" }, "scheme"],
    ["décima", { context: "Un tema", scheme: "décima" }, "scheme"],
  ];

  for (const [label, input, field] of cases) {
    const result = createGenerationBrief(input);

    assert.equal(result.ok, false, label);
    if (result.ok) continue;
    assert.deepEqual(
      result.errors.map((error) => error.field),
      [field],
      label,
    );
  }
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createGenerationBrief } from "../../domain/generation-brief/index.js";
import {
  generateQuatrains,
  type Finalist,
  type IncrementalCollaborators,
  type HardStage,
  type GenerationResult,
} from "./generate-quatrains.js";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const briefWithRetry = (() => {
  const result = createGenerationBrief({
    context: "egoísmo",
    candidateCount: 3,
    topK: 2,
    minimumScore: 80,
    verseRetryBudget: 2,
    llmCallBudget: 50,
  });
  if (!result.ok) throw new Error("fixture brief inválido");
  return result.value;
})();

const validHard = (): Readonly<Record<HardStage, "VALIDO">> => ({
  structure: "VALIDO",
  metric: "VALIDO",
  rhyme: "VALIDO",
  lexicon: "VALIDO",
  ambiguity: "VALIDO",
  safety: "VALIDO",
});

function collaborators(
  overrides: Partial<IncrementalCollaborators> = {},
): IncrementalCollaborators {
  const base: IncrementalCollaborators = {
    plan: async () => ({ intent: "egoísmo" }),
    finalWords: async () => [
      { v4: "sol", v2: "farol" },
      { v4: "mar", v2: "altar" },
    ],
    anchors: async () => ({}),
    writeVerse: async (slot) => `verso-${slot}`,
    validateVerse: async () => ({ verdict: "VALIDO" }),
    validateQuatrain: async () => validHard(),
    evaluate: async () => ({}),
    score: async () => 90,
    rank: async (items: readonly Finalist[]) =>
      [...items].sort((a, b) => b.score - a.score),
  };
  return { ...base, ...overrides };
}

// ---------------------------------------------------------------------------
// 1.3a — Retry budgets
// ---------------------------------------------------------------------------

describe("retry budgets", () => {
  it("retries writeVerse when validateVerse returns INVALIDO up to the budget", async () => {
    let writeCalls = 0;
    const result = await generateQuatrains(
      briefWithRetry,
      collaborators({
        writeVerse: async (slot) => {
          writeCalls += 1;
          return `verso-${slot}-${writeCalls}`;
        },
        validateVerse: async (_slot, verse) => {
          // First attempt for each slot fails; second succeeds
          if (
            verse.endsWith("-1") ||
            verse.endsWith("-3") ||
            verse.endsWith("-5") ||
            verse.endsWith("-7")
          ) {
            return { verdict: "INVALIDO", diagnostic: "métrica rota" };
          }
          return { verdict: "VALIDO" };
        },
      }),
    );
    // Each verse slot should have been retried at least once
    assert.ok(
      writeCalls > 4,
      `expected more than 4 writeVerse calls, got ${writeCalls}`,
    );
    assert.equal(result.status, "SUCCESS");
  });

  it("rejects the branch when retry budget is exhausted", async () => {
    let writeCalls = 0;
    const result = await generateQuatrains(
      briefWithRetry,
      collaborators({
        writeVerse: async (slot) => {
          writeCalls += 1;
          return `verso-${slot}`;
        },
        validateVerse: async () => ({
          verdict: "INVALIDO",
          diagnostic: "métrica rota",
        }),
      }),
    );
    // Should have retried (budget=2 means up to 2 retries per slot) then given up
    assert.ok(
      writeCalls <= 3 * 2 + 1,
      `expected bounded retries, got ${writeCalls}`,
    );
    assert.equal(result.status, "UNRELIABLE");
    assert.ok(
      result.rejected.some(
        (r) => r.reason.includes("retry") || r.reason.includes("budget"),
      ),
      "expected rejection reason to mention retry budget exhaustion",
    );
  });
});

// ---------------------------------------------------------------------------
// 1.3b — V4/V2 backtracking
// ---------------------------------------------------------------------------

describe("V4/V2 backtracking", () => {
  it("backtracks to the next V4/V2 pair when the first pair cannot produce valid verses", async () => {
    let pairIndex = 0;
    const pairs = [
      { v4: "sol", v2: "farol" },
      { v4: "mar", v2: "altar" },
      { v4: "dolor", v2: "amor" },
    ];
    const result = await generateQuatrains(
      briefWithRetry,
      collaborators({
        finalWords: async () => pairs,
        writeVerse: async (slot, _input) => {
          // First pair always produces bad verses; second and third succeed
          if (pairIndex === 0) return `bad-verso-${slot}`;
          return `verso-${slot}`;
        },
        validateVerse: async (_slot, verse) => {
          if (verse.startsWith("bad-")) {
            return { verdict: "INVALIDO", diagnostic: "sin sentido" };
          }
          return { verdict: "VALIDO" };
        },
      }),
    );
    assert.equal(result.status, "SUCCESS");
    assert.ok(result.finalists.length > 0);
    // The provenance should not reference the failed first pair
    for (const f of result.finalists) {
      assert.notDeepEqual(f.provenance, pairs[0]);
    }
  });

  it("exhausts all pairs and returns UNRELIABLE when none work", async () => {
    const result = await generateQuatrains(
      briefWithRetry,
      collaborators({
        finalWords: async () => [
          { v4: "sol", v2: "farol" },
          { v4: "mar", v2: "altar" },
        ],
        validateVerse: async () => ({
          verdict: "INVALIDO",
          diagnostic: "siempre falla",
        }),
      }),
    );
    assert.equal(result.status, "UNRELIABLE");
    assert.equal(result.finalists.length, 0);
    assert.ok(
      result.rejected.length >= 2,
      "expected rejection for each pair attempt",
    );
  });
});

// ---------------------------------------------------------------------------
// 1.3c — Metric and soft repairs
// ---------------------------------------------------------------------------

describe("metric and soft repairs", () => {
  it("invokes repair when metric validation returns DUDOSO and accepts the repaired verse", async () => {
    let repairCalled = false;
    const result = await generateQuatrains(
      briefWithRetry,
      collaborators({
        validateVerse: async (_slot, _verse) => ({
          verdict: "DUDOSO",
          diagnostic: "métrica dudosa",
        }),
        repairMetric: async (slot, verse) => {
          repairCalled = true;
          return { repaired: `${verse}-repaired`, verdict: "VALIDO" };
        },
      }),
    );
    assert.equal(repairCalled, true, "expected repairMetric to be called");
    assert.equal(result.status, "SUCCESS");
  });

  it("rejects the branch when metric repair also fails", async () => {
    const result = await generateQuatrains(
      briefWithRetry,
      collaborators({
        validateVerse: async () => ({
          verdict: "DUDOSO",
          diagnostic: "métrica dudosa",
        }),
        repairMetric: async (_slot, verse) => ({
          repaired: verse,
          verdict: "INVALIDO",
        }),
      }),
    );
    assert.equal(result.status, "UNRELIABLE");
    assert.ok(
      result.rejected.some(
        (r) => r.reason.includes("metric") || r.reason.includes("repair"),
      ),
      "expected rejection to mention metric repair failure",
    );
  });
});

// ---------------------------------------------------------------------------
// 1.3d — Cancellation via AbortSignal
// ---------------------------------------------------------------------------

describe("cancellation", () => {
  it("stops generation when the abort signal is triggered", async () => {
    const controller = new AbortController();
    let writeCalls = 0;
    // Abort after the first verse is written
    const result = await generateQuatrains(
      briefWithRetry,
      collaborators({
        writeVerse: async (slot) => {
          writeCalls += 1;
          if (writeCalls === 1) controller.abort();
          return `verso-${slot}`;
        },
      }),
      { signal: controller.signal },
    );
    assert.ok(
      writeCalls < 8,
      `expected early termination, got ${writeCalls} write calls`,
    );
    assert.equal(result.status, "UNRELIABLE");
  });

  it("throws when signal is already aborted before starting", async () => {
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(
      () =>
        generateQuatrains(briefWithRetry, collaborators(), {
          signal: controller.signal,
        }),
      { name: "AbortError" },
    );
  });
});

// ---------------------------------------------------------------------------
// 1.3e — Global LLM budget exhaustion
// ---------------------------------------------------------------------------

describe("global LLM budget exhaustion", () => {
  it("stops generation when the LLM call budget is exhausted", async () => {
    const briefWithSmallBudget = (() => {
      const result = createGenerationBrief({
        context: "egoísmo",
        candidateCount: 3,
        topK: 2,
        minimumScore: 80,
        llmCallBudget: 5,
      });
      if (!result.ok) throw new Error("fixture brief inválido");
      return result.value;
    })();

    let llmCalls = 0;
    const result = await generateQuatrains(
      briefWithSmallBudget,
      collaborators({
        writeVerse: async (slot) => {
          llmCalls += 1;
          return `verso-${slot}`;
        },
        plan: async () => {
          llmCalls += 1;
          return { intent: "egoísmo" };
        },
        finalWords: async () => {
          llmCalls += 1;
          return [
            { v4: "sol", v2: "farol" },
            { v4: "mar", v2: "altar" },
            { v4: "dolor", v2: "amor" },
          ];
        },
      }),
    );
    assert.ok(llmCalls <= 5, `expected at most 5 LLM calls, got ${llmCalls}`);
    assert.equal(result.status, "UNRELIABLE");
    assert.ok(
      result.rejected.some(
        (r) => r.reason.includes("budget") || r.reason.includes("LLM"),
      ),
      "expected rejection to mention LLM budget exhaustion",
    );
  });

  it("counts LLM calls across plan, finalWords, writeVerse, evaluate and repair", async () => {
    const briefWithBudget = (() => {
      const result = createGenerationBrief({
        context: "egoísmo",
        candidateCount: 1,
        topK: 1,
        minimumScore: 80,
        llmCallBudget: 100,
      });
      if (!result.ok) throw new Error("fixture brief inválido");
      return result.value;
    })();

    let totalLlmCalls = 0;
    const countCall = async <T>(fn: () => Promise<T>): Promise<T> => {
      totalLlmCalls += 1;
      return fn();
    };

    const result = await generateQuatrains(
      briefWithBudget,
      collaborators({
        plan: (brief) => countCall(async () => ({ intent: brief.context })),
        finalWords: () => countCall(async () => [{ v4: "sol", v2: "farol" }]),
        writeVerse: (slot) => countCall(async () => `verso-${slot}`),
        evaluate: (verses) => countCall(async () => ({ verses })),
      }),
    );
    // At minimum: 1 plan + 1 finalWords + 4 writeVerse + 1 evaluate = 7
    assert.ok(
      totalLlmCalls >= 7,
      `expected at least 7 LLM calls, got ${totalLlmCalls}`,
    );
    assert.equal(result.status, "SUCCESS");
  });
});

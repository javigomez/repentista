import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createGenerationBrief } from "../../domain/generation-brief/index.js";
import {
  generateQuatrains,
  type Finalist,
  type IncrementalCollaborators,
  type HardStage,
  type AuditEvent,
  type PipelineMetrics,
} from "./generate-quatrains.js";

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const brief = (() => {
  const result = createGenerationBrief({
    context: "egoísmo",
    candidateCount: 3,
    topK: 2,
    minimumScore: 80,
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
// Audit events
// ---------------------------------------------------------------------------

describe("audit events", () => {
  it("emits BRANCH_STARTED for each word pair attempted", async () => {
    const result = await generateQuatrains(brief, collaborators());
    const branchEvents = result.auditEvents.filter(
      (e) => e.type === "BRANCH_STARTED",
    );
    assert.equal(
      branchEvents.length,
      2,
      "expected one BRANCH_STARTED per word pair",
    );
  });

  it("emits VERSE_WRITTEN and VERSE_VALIDATED for each verse slot", async () => {
    const result = await generateQuatrains(brief, collaborators());
    const written = result.auditEvents.filter(
      (e) => e.type === "VERSE_WRITTEN",
    );
    const validated = result.auditEvents.filter(
      (e) => e.type === "VERSE_VALIDATED",
    );
    // 2 branches × 4 verses = 8 events each
    assert.equal(written.length, 8, "expected 8 VERSE_WRITTEN events");
    assert.equal(validated.length, 8, "expected 8 VERSE_VALIDATED events");
  });

  it("emits BRANCH_COMPLETED for branches that pass all hard gates", async () => {
    const result = await generateQuatrains(brief, collaborators());
    const completed = result.auditEvents.filter(
      (e) => e.type === "BRANCH_COMPLETED",
    );
    assert.equal(
      completed.length,
      2,
      "expected 2 BRANCH_COMPLETED events for successful branches",
    );
  });

  it("emits BRANCH_REJECTED with stage and reason when a branch fails", async () => {
    const result = await generateQuatrains(
      brief,
      collaborators({
        validateQuatrain: async () => ({
          ...validHard(),
          rhyme: "INVALIDO",
        }),
      }),
    );
    const rejected = result.auditEvents.filter(
      (e) => e.type === "BRANCH_REJECTED",
    );
    assert.ok(
      rejected.length >= 2,
      "expected at least 2 BRANCH_REJECTED events",
    );
    for (const event of rejected) {
      assert.equal(event.type, "BRANCH_REJECTED");
      assert.ok(event.stage.length > 0, "rejected event must have a stage");
      assert.ok(event.reason.length > 0, "rejected event must have a reason");
    }
  });

  it("emits PIPELINE_COMPLETED at the end of execution", async () => {
    const result = await generateQuatrains(brief, collaborators());
    const completed = result.auditEvents.filter(
      (e) => e.type === "PIPELINE_COMPLETED",
    );
    assert.equal(
      completed.length,
      1,
      "expected exactly one PIPELINE_COMPLETED event",
    );
  });

  it("includes timestamps in all audit events", async () => {
    const result = await generateQuatrains(brief, collaborators());
    for (const event of result.auditEvents) {
      assert.ok(
        typeof event.timestamp === "number" && event.timestamp > 0,
        `event ${event.type} must have a positive timestamp`,
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Pipeline metrics
// ---------------------------------------------------------------------------

describe("pipeline metrics", () => {
  it("tracks total branches attempted", async () => {
    const result = await generateQuatrains(brief, collaborators());
    assert.equal(
      result.metrics.branchesAttempted,
      2,
      "expected 2 branches attempted",
    );
  });

  it("tracks branches that survived all hard gates", async () => {
    const result = await generateQuatrains(brief, collaborators());
    assert.equal(
      result.metrics.branchesCompleted,
      2,
      "expected 2 branches completed",
    );
  });

  it("tracks branches rejected", async () => {
    const result = await generateQuatrains(
      brief,
      collaborators({
        validateQuatrain: async () => ({
          ...validHard(),
          rhyme: "INVALIDO",
        }),
      }),
    );
    assert.equal(
      result.metrics.branchesRejected,
      2,
      "expected 2 branches rejected",
    );
  });

  it("tracks finalists produced", async () => {
    const result = await generateQuatrains(brief, collaborators());
    assert.equal(
      result.metrics.finalistsProduced,
      2,
      "expected 2 finalists produced",
    );
  });

  it("tracks total LLM calls made", async () => {
    const result = await generateQuatrains(brief, collaborators());
    // 1 plan + 1 finalWords + (2 branches × (1 anchors + 4 writeVerse + 1 evaluate + 1 score)) = 16
    assert.ok(
      result.metrics.llmCallsMade > 0,
      "expected positive LLM call count",
    );
  });

  it("reports zero verse retries when no retry logic is triggered", async () => {
    const result = await generateQuatrains(brief, collaborators());
    assert.equal(
      result.metrics.verseRetries,
      0,
      "expected zero verse retries when all verses pass first attempt",
    );
  });
});

// ---------------------------------------------------------------------------
// Rejected-branch summary
// ---------------------------------------------------------------------------

describe("rejected-branch summary", () => {
  it("groups rejections by stage in the summary", async () => {
    const result = await generateQuatrains(
      brief,
      collaborators({
        validateQuatrain: async () => ({
          ...validHard(),
          rhyme: "INVALIDO",
        }),
      }),
    );
    assert.ok(
      result.rejectedBranchSummary.rhyme > 0,
      "expected rhyme rejections in summary",
    );
    assert.equal(
      result.rejectedBranchSummary.structure,
      0,
      "expected no structure rejections",
    );
  });

  it("counts verse-level rejections by slot", async () => {
    const result = await generateQuatrains(
      brief,
      collaborators({
        validateVerse: async (slot) => {
          if (slot === 2) {
            return { verdict: "INVALIDO", diagnostic: "métrica rota" };
          }
          return { verdict: "VALIDO" };
        },
      }),
    );
    assert.ok(
      result.rejectedBranchSummary.verseValidation > 0,
      "expected verse validation rejections in summary",
    );
  });

  it("returns zero counts when no branches are rejected", async () => {
    const result = await generateQuatrains(brief, collaborators());
    const total = Object.values(result.rejectedBranchSummary).reduce(
      (sum, count) => sum + count,
      0,
    );
    assert.equal(total, 0, "expected zero total rejections");
  });
});

// ---------------------------------------------------------------------------
// Finalists and failures separation
// ---------------------------------------------------------------------------

describe("finalists and failures separation", () => {
  it("keeps finalists and rejected in separate result fields", async () => {
    const result = await generateQuatrains(
      brief,
      collaborators({
        finalWords: async () => [
          { v4: "sol", v2: "farol" },
          { v4: "mar", v2: "altar" },
        ],
        // First pair fails verse validation; second pair succeeds
        validateVerse: async (_slot, verse) => {
          if (verse.includes("bad-")) {
            return { verdict: "INVALIDO", diagnostic: "sin sentido" };
          }
          return { verdict: "VALIDO" };
        },
        writeVerse: async (slot, input) => {
          const { words } = input as { words: { v4: string; v2: string } };
          if (words.v4 === "sol") return `bad-verso-${slot}`;
          return `verso-${slot}`;
        },
      }),
    );
    // Verify no finalist references the rejected branch's words
    for (const finalist of result.finalists) {
      assert.notDeepEqual(
        finalist.provenance,
        { v4: "sol", v2: "farol" },
        "finalist should not reference rejected branch",
      );
    }
    assert.ok(result.rejected.length > 0, "expected some rejected entries");
  });
});

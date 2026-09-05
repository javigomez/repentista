import type { GenerationBrief } from "../../domain/generation-brief/index.js";

export type HardStage =
  "structure" | "metric" | "rhyme" | "lexicon" | "ambiguity" | "safety";
export type Verdict = "VALIDO" | "DUDOSO" | "INVALIDO";

// ---------------------------------------------------------------------------
// Audit events
// ---------------------------------------------------------------------------

export type AuditEvent =
  | {
      readonly type: "BRANCH_STARTED";
      readonly timestamp: number;
      readonly pairIndex: number;
      readonly v4: string;
      readonly v2: string;
    }
  | {
      readonly type: "VERSE_WRITTEN";
      readonly timestamp: number;
      readonly pairIndex: number;
      readonly slot: 1 | 2 | 3 | 4;
      readonly verse: string;
    }
  | {
      readonly type: "VERSE_VALIDATED";
      readonly timestamp: number;
      readonly pairIndex: number;
      readonly slot: 1 | 2 | 3 | 4;
      readonly verdict: Verdict;
      readonly diagnostic?: string;
    }
  | {
      readonly type: "BRANCH_REJECTED";
      readonly timestamp: number;
      readonly pairIndex: number;
      readonly stage: string;
      readonly reason: string;
    }
  | {
      readonly type: "BRANCH_COMPLETED";
      readonly timestamp: number;
      readonly pairIndex: number;
      readonly score: number;
    }
  | {
      readonly type: "PIPELINE_COMPLETED";
      readonly timestamp: number;
      readonly finalistsCount: number;
      readonly rejectedCount: number;
    };

// ---------------------------------------------------------------------------
// Pipeline metrics
// ---------------------------------------------------------------------------

export interface PipelineMetrics {
  readonly branchesAttempted: number;
  readonly branchesCompleted: number;
  readonly branchesRejected: number;
  readonly finalistsProduced: number;
  readonly llmCallsMade: number;
  readonly verseRetries: number;
}

// ---------------------------------------------------------------------------
// Rejected-branch summary
// ---------------------------------------------------------------------------

export interface RejectedBranchSummary {
  readonly structure: number;
  readonly metric: number;
  readonly rhyme: number;
  readonly lexicon: number;
  readonly ambiguity: number;
  readonly safety: number;
  readonly verseValidation: number;
}

// ---------------------------------------------------------------------------
// Collaborators
// ---------------------------------------------------------------------------

export interface IncrementalCollaborators {
  readonly plan: (brief: GenerationBrief) => Promise<unknown>;
  readonly finalWords: (
    plan: unknown,
  ) => Promise<readonly { v4: string; v2: string }[]>;
  readonly anchors: (
    plan: unknown,
    words: { v4: string; v2: string },
  ) => Promise<unknown>;
  readonly writeVerse: (slot: 1 | 2 | 3 | 4, input: unknown) => Promise<string>;
  readonly validateVerse: (
    slot: 1 | 2 | 3 | 4,
    verse: string,
    input: unknown,
  ) => Promise<{ verdict: Verdict; diagnostic?: string }>;
  readonly validateQuatrain: (
    verses: readonly [string, string, string, string],
    input: unknown,
  ) => Promise<Readonly<Record<HardStage, Verdict>>>;
  readonly evaluate: (
    verses: readonly [string, string, string, string],
    input: unknown,
  ) => Promise<unknown>;
  readonly repair?: (
    verses: readonly [string, string, string, string],
    input: unknown,
  ) => Promise<readonly [string, string, string, string][]>;
  readonly repairMetric?: (
    slot: 1 | 2 | 3 | 4,
    verse: string,
  ) => Promise<{ repaired: string; verdict: Verdict }>;
  readonly score: (
    verses: readonly [string, string, string, string],
    evaluations: unknown,
  ) => Promise<number>;
  readonly rank: (
    candidates: readonly Finalist[],
  ) => Promise<readonly Finalist[]>;
}

// ---------------------------------------------------------------------------
// Finalist and result
// ---------------------------------------------------------------------------

export interface Finalist {
  readonly plan: unknown;
  readonly verses: readonly [string, string, string, string];
  readonly score: number;
  readonly provenance: { readonly v2: string; readonly v4: string };
}

export interface GenerationResult {
  readonly finalists: readonly Finalist[];
  readonly rejected: readonly {
    readonly stage: string;
    readonly reason: string;
  }[];
  readonly status: "SUCCESS" | "UNRELIABLE";
  readonly auditEvents: readonly AuditEvent[];
  readonly metrics: PipelineMetrics;
  readonly rejectedBranchSummary: RejectedBranchSummary;
}

export interface GenerationOptions {
  readonly signal?: AbortSignal;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HARD_STAGES: readonly HardStage[] = [
  "structure",
  "metric",
  "rhyme",
  "lexicon",
  "ambiguity",
  "safety",
];

const emptyRejectedSummary = (): RejectedBranchSummary =>
  Object.freeze({
    structure: 0,
    metric: 0,
    rhyme: 0,
    lexicon: 0,
    ambiguity: 0,
    safety: 0,
    verseValidation: 0,
  });

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

export async function generateQuatrains(
  brief: GenerationBrief,
  collaborators: IncrementalCollaborators,
  options?: GenerationOptions,
): Promise<GenerationResult> {
  const auditEvents: AuditEvent[] = [];
  const rejected: { stage: string; reason: string }[] = [];
  const summaryCounts = { ...emptyRejectedSummary() };
  let llmCallsMade = 0;
  let verseRetries = 0;

  const now = (): number => Date.now();

  if (options?.signal?.aborted) {
    throw Object.assign(new Error("Generation cancelled"), { name: "AbortError" });
  }
  const exhausted = (): boolean => llmCallsMade >= brief.llmCallBudget;
  const cancelled = (): boolean => options?.signal?.aborted === true;
  const unreliable = (stage: string, reason: string): void => {
    rejected.push({ stage, reason });
    auditEvents.push(Object.freeze({ type: "BRANCH_REJECTED", timestamp: now(), pairIndex: branchesAttempted, stage, reason }));
  };

  if (exhausted()) {
    unreliable("budget", "LLM budget exhausted");
    return Object.freeze({ finalists: [], rejected: Object.freeze(rejected), status: "UNRELIABLE", auditEvents: Object.freeze(auditEvents), metrics: Object.freeze({ branchesAttempted: 0, branchesCompleted: 0, branchesRejected: 0, finalistsProduced: 0, llmCallsMade, verseRetries }), rejectedBranchSummary: Object.freeze(summaryCounts) });
  }
  const plan = await collaborators.plan(brief);
  llmCallsMade += 1;

  const wordPairs = await collaborators.finalWords(plan);
  llmCallsMade += 1;

  let branchesAttempted = 0;
  let branchesCompleted = 0;
  let branchesRejected = 0;
  const scored: Finalist[] = [];

  for (const words of wordPairs.slice(0, brief.candidateCount)) {
    if (cancelled() || exhausted()) {
      unreliable("budget", cancelled() ? "generation cancelled" : "LLM budget exhausted");
      break;
    }
    const pairIndex = branchesAttempted;
    branchesAttempted += 1;

    auditEvents.push(
      Object.freeze({
        type: "BRANCH_STARTED",
        timestamp: now(),
        pairIndex,
        v4: words.v4,
        v2: words.v2,
      }),
    );

    const anchors = await collaborators.anchors(plan, words);
    const verses: string[] = [];
    let blocked = false;

    for (const slot of [1, 2, 3, 4] as const) {
      let accepted: string | undefined;
      for (let attempt = 0; attempt <= brief.verseRetryBudget; attempt += 1) {
        if (cancelled() || exhausted()) break;
        const verse = await collaborators.writeVerse(slot, { plan, words, anchors, verses: [...verses] });
        llmCallsMade += 1;

        auditEvents.push(
        Object.freeze({
          type: "VERSE_WRITTEN",
          timestamp: now(),
          pairIndex,
          slot,
          verse,
        }),
        );

        let validation = await collaborators.validateVerse(slot, verse, {
        plan,
        words,
        anchors,
      });

        if (validation.verdict === "DUDOSO" && collaborators.repairMetric !== undefined) {
          const repaired = await collaborators.repairMetric(slot, verse);
          if (repaired.verdict === "VALIDO") { validation = { verdict: "VALIDO" }; accepted = repaired.repaired; }
          else validation = { verdict: "INVALIDO", diagnostic: "metric repair failed" };
        } else if (validation.verdict === "VALIDO") accepted = verse;
        auditEvents.push(
        Object.freeze({
          type: "VERSE_VALIDATED",
          timestamp: now(),
          pairIndex,
          slot,
          verdict: validation.verdict,
          diagnostic: validation.diagnostic,
        }),
        );

        if (accepted !== undefined) break;
        if (attempt < brief.verseRetryBudget) { verseRetries += 1; continue; }
        if (cancelled() || exhausted()) break;
        const reason = validation.diagnostic ?? validation.verdict;
        const finalReason = `${reason}; retry budget exhausted`;
        rejected.push({ stage: `V${slot}_VALIDATED`, reason: finalReason });
        summaryCounts.verseValidation += 1;
        auditEvents.push(
          Object.freeze({
            type: "BRANCH_REJECTED",
            timestamp: now(),
            pairIndex,
            stage: `V${slot}_VALIDATED`,
            reason: finalReason,
          }),
        );
        branchesRejected += 1;
        blocked = true;
        break;
      }
      if (accepted === undefined) { blocked = true; break; }
      verses.push(accepted);
    }

    if (blocked || verses.length !== 4) continue;

    const tuple = verses as [string, string, string, string];
    const hard = await collaborators.validateQuatrain(tuple, {
      plan,
      words,
      anchors,
    });

    const failed = HARD_STAGES.find((stage) => hard[stage] !== "VALIDO");
    if (failed !== undefined) {
      const reason = hard[failed];
      rejected.push({ stage: failed, reason });
      summaryCounts[failed] += 1;
      auditEvents.push(
        Object.freeze({
          type: "BRANCH_REJECTED",
          timestamp: now(),
          pairIndex,
          stage: failed,
          reason,
        }),
      );
      branchesRejected += 1;
      continue;
    }

    if (exhausted() || cancelled()) { unreliable("budget", cancelled() ? "generation cancelled" : "LLM budget exhausted"); break; }
    const evaluated = await collaborators.evaluate(tuple, {
      plan,
      words,
      anchors,
    });
    llmCallsMade += 1;

    const repaired =
      collaborators.repair === undefined
        ? [tuple]
        : await collaborators.repair(tuple, evaluated);

    for (const candidate of repaired) {
      const score = await collaborators.score(candidate, evaluated);
      if (score >= brief.minimumScore) {
        scored.push({ plan, verses: candidate, score, provenance: words });
        branchesCompleted += 1;
        auditEvents.push(
          Object.freeze({
            type: "BRANCH_COMPLETED",
            timestamp: now(),
            pairIndex,
            score,
          }),
        );
      }
    }
  }

  const finalists = (await collaborators.rank(scored)).slice(0, brief.topK);

  auditEvents.push(
    Object.freeze({
      type: "PIPELINE_COMPLETED",
      timestamp: now(),
      finalistsCount: finalists.length,
      rejectedCount: rejected.length,
    }),
  );

  return Object.freeze({
    finalists,
    rejected: Object.freeze(rejected),
    status: finalists.length > 0 ? "SUCCESS" : "UNRELIABLE",
    auditEvents: Object.freeze(auditEvents),
    metrics: Object.freeze({
      branchesAttempted,
      branchesCompleted,
      branchesRejected,
      finalistsProduced: finalists.length,
      llmCallsMade,
      verseRetries,
    }),
    rejectedBranchSummary: Object.freeze(summaryCounts),
  });
}

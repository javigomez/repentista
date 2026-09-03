import type { GenerationBrief } from "../../domain/generation-brief/index.js";

export type HardStage =
  "structure" | "metric" | "rhyme" | "lexicon" | "ambiguity" | "safety";
export type Verdict = "VALIDO" | "DUDOSO" | "INVALIDO";

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
}

export interface GenerationOptions {
  readonly signal?: AbortSignal;
}

const HARD_STAGES: readonly HardStage[] = [
  "structure",
  "metric",
  "rhyme",
  "lexicon",
  "ambiguity",
  "safety",
];

export async function generateQuatrains(
  brief: GenerationBrief,
  collaborators: IncrementalCollaborators,
  options?: GenerationOptions,
): Promise<GenerationResult> {
  const plan = await collaborators.plan(brief);
  const rejected: { stage: string; reason: string }[] = [];
  const scored: Finalist[] = [];
  const wordPairs = await collaborators.finalWords(plan);

  for (const words of wordPairs.slice(0, brief.candidateCount)) {
    const anchors = await collaborators.anchors(plan, words);
    const verses: string[] = [];
    let blocked = false;
    for (const slot of [1, 2, 3, 4] as const) {
      const verse = await collaborators.writeVerse(slot, {
        plan,
        words,
        anchors,
        verses: [...verses],
      });
      const validation = await collaborators.validateVerse(slot, verse, {
        plan,
        words,
        anchors,
      });
      if (validation.verdict !== "VALIDO") {
        rejected.push({
          stage: `V${slot}_VALIDATED`,
          reason: validation.diagnostic ?? validation.verdict,
        });
        blocked = true;
        break;
      }
      verses.push(verse);
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
      rejected.push({ stage: failed, reason: hard[failed] });
      continue;
    }
    const evaluated = await collaborators.evaluate(tuple, {
      plan,
      words,
      anchors,
    });
    const repaired =
      collaborators.repair === undefined
        ? [tuple]
        : await collaborators.repair(tuple, evaluated);
    for (const candidate of repaired) {
      const score = await collaborators.score(candidate, evaluated);
      if (score >= brief.minimumScore)
        scored.push({ plan, verses: candidate, score, provenance: words });
    }
  }
  const finalists = (await collaborators.rank(scored)).slice(0, brief.topK);
  return Object.freeze({
    finalists,
    rejected: Object.freeze(rejected),
    status: finalists.length > 0 ? "SUCCESS" : "UNRELIABLE",
  });
}

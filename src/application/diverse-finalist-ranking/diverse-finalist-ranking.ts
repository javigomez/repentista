import { transitionQuatrainCandidate, type QuatrainCandidate, type ScoreBreakdownInput } from "../../domain/quatrain-candidate/index.js";

export const DIVERSE_FINALIST_RANKING_VERSION = "diverse-finalist-ranking/0.1.0";

export interface CandidateSimilarity {
  readonly candidateId: string;
  readonly similarity: number;
  readonly sharedFeatures: readonly string[];
}

export interface RankedCandidateInput {
  readonly id: string;
  readonly score: number;
  readonly scoreBreakdown: readonly ScoreBreakdownInput[];
  readonly similarityToSelected: readonly CandidateSimilarity[];
}

export interface FinalistReason {
  readonly candidateId: string;
  readonly reasonCode: "SELECTED" | "BELOW_THRESHOLD" | "REDUNDANT" | "BLOCKED_STATE";
  readonly explanation: string;
  readonly similarityPenalty?: number;
  readonly blockedBy?: string;
}

export interface FinalistResult {
  readonly candidateId: string;
  readonly rank: number;
  readonly score: number;
  readonly scoreBreakdown: readonly ScoreBreakdownInput[];
  readonly reason: FinalistReason;
}

export interface DiverseFinalistRankingRequest {
  readonly candidates: readonly RankedCandidateInput[];
  readonly threshold: number;
  readonly limit: number;
  readonly minimumDiversity: number;
}

export interface DiverseFinalistRankingResult {
  readonly policyVersion: typeof DIVERSE_FINALIST_RANKING_VERSION;
  readonly finalists: readonly FinalistResult[];
  readonly excluded: readonly FinalistReason[];
  readonly deficit: number;
}

export interface FinalistSelectionRequest extends DiverseFinalistRankingRequest {
  readonly selectedAt: string;
  readonly selectedBy: string;
}

export interface FinalistSelectionResult extends DiverseFinalistRankingResult {
  readonly candidates: readonly QuatrainCandidate[];
}

const compareCandidates = (left: RankedCandidateInput, right: RankedCandidateInput): number => {
  if (left.score !== right.score) return right.score - left.score;
  const leftBreakdown = left.scoreBreakdown.map((item) => item.points);
  const rightBreakdown = right.scoreBreakdown.map((item) => item.points);
  for (let index = 0; index < Math.max(leftBreakdown.length, rightBreakdown.length); index += 1) {
    const difference = (rightBreakdown[index] ?? 0) - (leftBreakdown[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return left.id.localeCompare(right.id);
};

export function rankDiverseFinalists(request: DiverseFinalistRankingRequest): DiverseFinalistRankingResult {
  const ordered = [...request.candidates].sort(compareCandidates);
  const excluded: FinalistReason[] = ordered
    .filter((candidate) => candidate.score < request.threshold)
    .map((candidate) => ({
      candidateId: candidate.id,
      reasonCode: "BELOW_THRESHOLD" as const,
      explanation: `Score ${candidate.score} is below threshold ${request.threshold}.`,
    }));
  const eligible = ordered.filter((candidate) => candidate.score >= request.threshold);
  const finalists: FinalistResult[] = [];

  while (finalists.length < request.limit) {
    const next = eligible.find((candidate) => !finalists.some((selected) => {
      const relation = candidate.similarityToSelected.find((item) => item.candidateId === selected.candidateId);
      return relation !== undefined && relation.similarity >= request.minimumDiversity;
    }));
    if (next === undefined) break;
    const blockers = finalists.map((selected) => next.similarityToSelected.find((item) => item.candidateId === selected.candidateId)).filter((item) => item !== undefined);
    const strongest = blockers.sort((a, b) => b.similarity - a.similarity)[0];
    const reason: FinalistReason = {
      candidateId: next.id,
      reasonCode: "SELECTED",
      explanation: strongest === undefined ? "Highest eligible score in stable order." : "Selected after satisfying the minimum diversity distance.",
      ...(strongest === undefined ? {} : { similarityPenalty: strongest.similarity }),
    };
    finalists.push({ candidateId: next.id, rank: finalists.length + 1, score: next.score, scoreBreakdown: next.scoreBreakdown, reason });
    eligible.splice(eligible.indexOf(next), 1);
  }

  for (const candidate of eligible) {
    const blocker = finalists.map((selected) => candidate.similarityToSelected.find((item) => item.candidateId === selected.candidateId)).find((item) => item !== undefined && item.similarity >= request.minimumDiversity);
    if (blocker !== undefined) excluded.push({ candidateId: candidate.id, reasonCode: "REDUNDANT", explanation: `Similarity ${blocker.similarity} with ${blocker.candidateId} meets the redundancy threshold.`, similarityPenalty: blocker.similarity, blockedBy: blocker.candidateId });
  }
  return Object.freeze({ policyVersion: DIVERSE_FINALIST_RANKING_VERSION, finalists: Object.freeze(finalists), excluded: Object.freeze(excluded), deficit: Math.max(0, request.limit - finalists.length) });
}

export function selectDiverseFinalists(
  candidates: readonly QuatrainCandidate[],
  request: FinalistSelectionRequest,
): FinalistSelectionResult {
  const blocked: FinalistReason[] = candidates
    .filter((candidate) => candidate.state !== "PUNTUADO" || candidate.score === undefined)
    .map((candidate) => ({
      candidateId: candidate.id,
      reasonCode: "BLOCKED_STATE" as const,
      explanation: `Candidate is not eligible from state ${candidate.state}.`,
    }));
  const ranked = rankDiverseFinalists({ ...request, candidates: candidates.filter((candidate): candidate is QuatrainCandidate & { score: NonNullable<QuatrainCandidate["score"]> } => candidate.state === "PUNTUADO" && candidate.score !== undefined).map((candidate) => ({ id: candidate.id, score: candidate.score.score, scoreBreakdown: candidate.score.breakdown, similarityToSelected: [] })) });
  const selectedIds = new Set(ranked.finalists.map((item) => item.candidateId));
  const updated = candidates.map((candidate) => {
    const finalist = ranked.finalists.find((item) => item.candidateId === candidate.id);
    if (finalist === undefined) return candidate;
    const transitioned = transitionQuatrainCandidate(candidate, { type: "FINALIST_SELECTED", at: request.selectedAt, rank: finalist.rank, selectedBy: request.selectedBy });
    if (!transitioned.ok) throw new Error(transitioned.error.message);
    return transitioned.value;
  });
  return Object.freeze({ ...ranked, excluded: Object.freeze([...blocked, ...ranked.excluded]), candidates: Object.freeze(updated), deficit: Math.max(0, request.limit - selectedIds.size) });
}

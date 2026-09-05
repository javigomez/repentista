/** Ordered stages owned by the incremental generation application. */
export const INCREMENTAL_STATES = Object.freeze([
  "BRIEF",
  "SEMANTIC_PLAN",
  "V4_SELECTED",
  "V2_SELECTED",
  "ANCHORS_PLANNED",
  "BUDGETS_PLANNED",
  "V1_WRITTEN",
  "V1_VALIDATED",
  "V2_WRITTEN",
  "V2_VALIDATED",
  "V3_WRITTEN",
  "V3_VALIDATED",
  "V4_WRITTEN",
  "V4_VALIDATED",
  "QUATRAIN_VALIDATED",
  "EVALUATED",
  "REPAIRED",
  "SCORED",
  "RANKED",
] as const);

export type IncrementalState = (typeof INCREMENTAL_STATES)[number];

export type IncrementalBranch =
  | { readonly state: "BRIEF"; readonly brief: unknown }
  | { readonly state: "SEMANTIC_PLAN"; readonly brief: unknown; readonly plan: unknown }
  | { readonly state: "V4_SELECTED"; readonly brief: unknown; readonly plan: unknown; readonly v4: unknown }
  | { readonly state: "V2_SELECTED"; readonly brief: unknown; readonly plan: unknown; readonly v4: unknown; readonly v2: unknown }
  | { readonly state: Exclude<IncrementalState, "BRIEF" | "SEMANTIC_PLAN" | "V4_SELECTED" | "V2_SELECTED">; readonly artifacts: Readonly<Record<string, unknown>> };

export function nextIncrementalState(from: IncrementalState, to: IncrementalState): boolean {
  const index = INCREMENTAL_STATES.indexOf(from);
  return index >= 0 && INCREMENTAL_STATES[index + 1] === to;
}

export function assertNextIncrementalState(from: IncrementalState, to: IncrementalState): void {
  if (!nextIncrementalState(from, to)) {
    throw new Error(`Invalid incremental transition: ${from} -> ${to}`);
  }
}

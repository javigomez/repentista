import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  INCREMENTAL_STATES,
  nextIncrementalState,
  type IncrementalState,
} from "./state-machine.js";

describe("incremental generation state machine", () => {
  it("declares the complete ordered flow from brief to ranking", () => {
    assert.deepEqual(INCREMENTAL_STATES, [
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
    ] satisfies readonly IncrementalState[]);
  });

  it("allows only the next state and never skips hard gates", () => {
    for (let index = 0; index < INCREMENTAL_STATES.length - 1; index += 1) {
      const from = INCREMENTAL_STATES[index];
      const to = INCREMENTAL_STATES[index + 1];
      assert.equal(nextIncrementalState(from, to), true, `${from} -> ${to}`);
    }

    assert.equal(nextIncrementalState("V4_SELECTED", "ANCHORS_PLANNED"), false);
    assert.equal(nextIncrementalState("V2_VALIDATED", "SCORED"), false);
    assert.equal(nextIncrementalState("QUATRAIN_VALIDATED", "RANKED"), false);
  });

  it("rejects terminal and unknown transitions", () => {
    assert.equal(nextIncrementalState("RANKED", "BRIEF"), false);
    assert.equal(nextIncrementalState("BRIEF", "BRIEF"), false);
  });
});

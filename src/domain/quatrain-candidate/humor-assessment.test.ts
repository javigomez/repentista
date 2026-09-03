import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  recordHumorAssessment,
  type HumorAssessmentRecord,
  type QuatrainCandidate,
} from "./index.js";
import { candidateInState, humorAssessment } from "./test-fixtures.js";

describe("humor assessment", () => {
    describe("recording", () => {
      it("records a humor assessment without changing state or hard validation results", () => {
        const candidate = candidateInState("VALIDO");
        const result = recordHumorAssessment(candidate, humorAssessment());

        assert.equal(result.ok, true);
        if (!result.ok) throw new Error("Expected successful result in test");

        assert.equal(result.value.state, "VALIDO");
        assert.equal(result.value.plan, candidate.plan);
        assert.equal(result.value.provenance, candidate.provenance);
        assert.equal(result.value.validationCompletion, candidate.validationCompletion);
        assert.deepEqual(result.value.rejections, candidate.rejections);
        assert.equal(result.value.score, candidate.score);
        assert.deepEqual(result.value.humorAssessment, humorAssessment());
        assert.equal(result.value.events.at(-1)?.type, "HUMOR_RECORDED");
        assert.deepEqual(
          result.value.events.at(-1)?.humorAssessment,
          result.value.humorAssessment,
        );
        assert.equal(Object.isFrozen(result.value), true);
        assert.equal(Object.isFrozen(result.value.humorAssessment), true);
        assert.equal(Object.isFrozen(result.value.humorAssessment?.fragments), true);
        assert.equal(Object.isFrozen(result.value.humorAssessment?.fragments[0]), true);
      });
    });

    describe("eligibility and bounds", () => {
      it("rejects humor assessment when a hard blocker is present", () => {
        const blockedStates: readonly QuatrainCandidate["state"][] = [
          "GENERADO",
          "VALIDACION_PENDIENTE",
          "RECHAZADO",
        ];

        for (const state of blockedStates) {
          const candidate = candidateInState(state);
          const result = recordHumorAssessment(candidate, humorAssessment());

          assert.equal(result.ok, false, `${state} should reject the assessment`);
          if (result.ok) continue;

          assert.equal(result.error.code, "STATE_NOT_ELIGIBLE");
          assert.equal(result.error.currentState, state);
          assert.equal(candidate.state, state);
          assert.equal(candidate.humorAssessment, undefined);
        }
      });

      it("rejects out-of-range humor note and confidence", () => {
        const candidate = candidateInState("VALIDO");

        for (const note of [11, -1]) {
          const result = recordHumorAssessment(candidate, humorAssessment({ note }));

          assert.equal(result.ok, false, `note ${note} should be rejected`);
          if (result.ok) continue;

          assert.equal(result.error.code, "INVALID_NOTE");
          assert.equal(result.error.note, note);
        }

        for (const confidence of [1.5, -0.1]) {
          const result = recordHumorAssessment(
            candidate,
            humorAssessment({ confidence }),
          );

          assert.equal(result.ok, false, `confidence ${confidence} should be rejected`);
          if (result.ok) continue;

          assert.equal(result.error.code, "INVALID_CONFIDENCE");
          assert.equal(result.error.confidence, confidence);
        }
      });
    });

    describe("evidence and labels", () => {
      it("rejects a humor assessment without textual evidence citations", () => {
        const candidate = candidateInState("VALIDO");

        const noFragments = recordHumorAssessment(
          candidate,
          humorAssessment({ fragments: [] }),
        );

        assert.equal(noFragments.ok, false);
        if (!noFragments.ok) {
          assert.equal(noFragments.error.code, "INVALID_HUMOR_FIELD");
          assert.equal(noFragments.error.path, "$.fragments");
        }

        const blankFragment = recordHumorAssessment(
          candidate,
          humorAssessment({
            fragments: [{ slot: "V4", fragment: "   ", reason: "justificación" }],
          }),
        );

        assert.equal(blankFragment.ok, false);
        if (!blankFragment.ok) {
          assert.equal(blankFragment.error.code, "INVALID_HUMOR_FIELD");
          assert.equal(blankFragment.error.path, "$.fragments");
        }

        const blankReason = recordHumorAssessment(
          candidate,
          humorAssessment({
            fragments: [{ slot: "V4", fragment: "solo el olor", reason: "  " }],
          }),
        );

        assert.equal(blankReason.ok, false);
        if (!blankReason.ok) {
          assert.equal(blankReason.error.code, "INVALID_HUMOR_FIELD");
          assert.equal(blankReason.error.path, "$.fragments");
        }
      });

      it("rejects invalid humor mechanism and clarity labels", () => {
        const candidate = candidateInState("VALIDO");

        const badMechanism = recordHumorAssessment(
          candidate,
          humorAssessment({ mechanism: "CHISTE_MALO" as HumorAssessmentRecord["mechanism"] }),
        );

        assert.equal(badMechanism.ok, false);
        if (!badMechanism.ok) {
          assert.equal(badMechanism.error.code, "INVALID_HUMOR_FIELD");
          assert.equal(badMechanism.error.path, "$.mechanism");
        }

        const badClarity = recordHumorAssessment(
          candidate,
          humorAssessment({ clarity: "OSCURA" as HumorAssessmentRecord["clarity"] }),
        );

        assert.equal(badClarity.ok, false);
        if (!badClarity.ok) {
          assert.equal(badClarity.error.code, "INVALID_HUMOR_FIELD");
          assert.equal(badClarity.error.path, "$.clarity");
        }
      });
    });
});

import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  recordPunchlineAssessment,
  type PunchlineAssessmentRecord,
  type QuatrainCandidate,
} from "./index.js";
import { candidateInState, punchlineAssessment } from "./test-fixtures.js";

describe("punchline assessment", () => {
    describe("recording", () => {
      it("records a punchline assessment without changing state or hard validation results", () => {
        const candidate = candidateInState("VALIDO");
        const result = recordPunchlineAssessment(candidate, punchlineAssessment());

        assert.equal(result.ok, true);
        if (!result.ok) throw new Error("Expected successful result in test");

        assert.equal(result.value.state, "VALIDO");
        assert.equal(result.value.plan, candidate.plan);
        assert.equal(result.value.provenance, candidate.provenance);
        assert.equal(result.value.validationCompletion, candidate.validationCompletion);
        assert.deepEqual(result.value.rejections, candidate.rejections);
        assert.equal(result.value.score, candidate.score);
        assert.deepEqual(result.value.punchlineAssessment, punchlineAssessment());
        assert.equal(result.value.events.at(-1)?.type, "PUNCHLINE_RECORDED");
        assert.deepEqual(
          result.value.events.at(-1)?.punchlineAssessment,
          result.value.punchlineAssessment,
        );
        assert.equal(Object.isFrozen(result.value), true);
        assert.equal(Object.isFrozen(result.value.punchlineAssessment), true);
        assert.equal(Object.isFrozen(result.value.punchlineAssessment?.expectationEvidence), true);
      });
    });

    describe("eligibility and bounds", () => {
      it("rejects punchline assessment when a hard blocker is present", () => {
        const blockedStates: readonly QuatrainCandidate["state"][] = [
          "GENERADO",
          "VALIDACION_PENDIENTE",
          "RECHAZADO",
        ];

        for (const state of blockedStates) {
          const candidate = candidateInState(state);
          const result = recordPunchlineAssessment(candidate, punchlineAssessment());

          assert.equal(result.ok, false, `${state} should reject the assessment`);
          if (result.ok) continue;

          assert.equal(result.error.code, "STATE_NOT_ELIGIBLE");
          assert.equal(result.error.currentState, state);
          assert.equal(candidate.state, state);
          assert.equal(candidate.punchlineAssessment, undefined);
        }
      });

      it("rejects out-of-range punchline note and confidence", () => {
        const candidate = candidateInState("VALIDO");

        for (const note of [11, -1]) {
          const result = recordPunchlineAssessment(candidate, punchlineAssessment({ note }));

          assert.equal(result.ok, false, `note ${note} should be rejected`);
          if (result.ok) continue;

          assert.equal(result.error.code, "INVALID_NOTE");
          assert.equal(result.error.note, note);
        }

        for (const confidence of [1.5, -0.1]) {
          const result = recordPunchlineAssessment(
            candidate,
            punchlineAssessment({ confidence }),
          );

          assert.equal(result.ok, false, `confidence ${confidence} should be rejected`);
          if (result.ok) continue;

          assert.equal(result.error.code, "INVALID_CONFIDENCE");
          assert.equal(result.error.confidence, confidence);
        }
      });
    });

    describe("evidence and labels", () => {
      it("rejects a punchline assessment without expectation or resolution summaries", () => {
        const candidate = candidateInState("VALIDO");

        const emptyExpectation = recordPunchlineAssessment(
          candidate,
          punchlineAssessment({ expectation: "   " }),
        );

        assert.equal(emptyExpectation.ok, false);
        if (!emptyExpectation.ok) {
          assert.equal(emptyExpectation.error.code, "INVALID_PUNCHLINE_FIELD");
          assert.equal(emptyExpectation.error.path, "$.expectation");
        }

        const emptyResolution = recordPunchlineAssessment(
          candidate,
          punchlineAssessment({ resolution: "" }),
        );

        assert.equal(emptyResolution.ok, false);
        if (!emptyResolution.ok) {
          assert.equal(emptyResolution.error.code, "INVALID_PUNCHLINE_FIELD");
          assert.equal(emptyResolution.error.path, "$.resolution");
        }
      });

      it("rejects a punchline assessment without textual evidence citations", () => {
        const candidate = candidateInState("VALIDO");

        const noExpectationEvidence = recordPunchlineAssessment(
          candidate,
          punchlineAssessment({ expectationEvidence: [] }),
        );

        assert.equal(noExpectationEvidence.ok, false);
        if (!noExpectationEvidence.ok) {
          assert.equal(noExpectationEvidence.error.code, "INVALID_PUNCHLINE_FIELD");
          assert.equal(noExpectationEvidence.error.path, "$.expectationEvidence");
        }

        const blankExpectationEvidence = recordPunchlineAssessment(
          candidate,
          punchlineAssessment({ expectationEvidence: ["  "] }),
        );

        assert.equal(blankExpectationEvidence.ok, false);
        if (!blankExpectationEvidence.ok) {
          assert.equal(blankExpectationEvidence.error.code, "INVALID_PUNCHLINE_FIELD");
          assert.equal(blankExpectationEvidence.error.path, "$.expectationEvidence");
        }

        const noResolutionEvidence = recordPunchlineAssessment(
          candidate,
          punchlineAssessment({ resolutionEvidence: "" }),
        );

        assert.equal(noResolutionEvidence.ok, false);
        if (!noResolutionEvidence.ok) {
          assert.equal(noResolutionEvidence.error.code, "INVALID_PUNCHLINE_FIELD");
          assert.equal(noResolutionEvidence.error.path, "$.resolutionEvidence");
        }
      });

      it("rejects invalid twist degree and context dependency labels", () => {
        const candidate = candidateInState("VALIDO");

        const badTwist = recordPunchlineAssessment(
          candidate,
          punchlineAssessment({ twistDegree: "ENORME" as PunchlineAssessmentRecord["twistDegree"] }),
        );

        assert.equal(badTwist.ok, false);
        if (!badTwist.ok) {
          assert.equal(badTwist.error.code, "INVALID_PUNCHLINE_FIELD");
          assert.equal(badTwist.error.path, "$.twistDegree");
        }

        const badDependency = recordPunchlineAssessment(
          candidate,
          punchlineAssessment({
            contextDependency: "ABSOLUTA" as PunchlineAssessmentRecord["contextDependency"],
          }),
        );

        assert.equal(badDependency.ok, false);
        if (!badDependency.ok) {
          assert.equal(badDependency.error.code, "INVALID_PUNCHLINE_FIELD");
          assert.equal(badDependency.error.path, "$.contextDependency");
        }
      });
    });
});

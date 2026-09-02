import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  recordCoherenceAssessment,
  type CoherenceAssessmentRecord,
  type QuatrainCandidate,
  type VerseSlot,
} from "./index.js";
import { candidateInState, coherenceAssessment } from "./test-fixtures.js";

describe("coherence assessment", () => {
    describe("recording", () => {
      it("records a coherence assessment without changing state or hard validation results", () => {
        const candidate = candidateInState("VALIDO");
        const result = recordCoherenceAssessment(candidate, coherenceAssessment());

        assert.equal(result.ok, true);
        if (!result.ok) throw new Error("Expected successful result in test");

        assert.equal(result.value.state, "VALIDO");
        assert.equal(result.value.plan, candidate.plan);
        assert.equal(result.value.provenance, candidate.provenance);
        assert.equal(result.value.validationCompletion, candidate.validationCompletion);
        assert.deepEqual(result.value.rejections, candidate.rejections);
        assert.equal(result.value.score, candidate.score);
        assert.deepEqual(result.value.coherenceAssessment, coherenceAssessment());
        assert.equal(result.value.events.at(-1)?.type, "COHERENCE_RECORDED");
        assert.deepEqual(
          result.value.events.at(-1)?.coherenceAssessment,
          result.value.coherenceAssessment,
        );
        assert.equal(Object.isFrozen(result.value), true);
        assert.equal(Object.isFrozen(result.value.coherenceAssessment), true);
        assert.equal(Object.isFrozen(result.value.coherenceAssessment?.transitions), true);
      });
    });

    describe("eligibility and bounds", () => {
      it("rejects coherence assessment when a hard blocker is present", () => {
        const blockedStates: readonly QuatrainCandidate["state"][] = [
          "GENERADO",
          "VALIDACION_PENDIENTE",
          "RECHAZADO",
        ];

        for (const state of blockedStates) {
          const candidate = candidateInState(state);
          const result = recordCoherenceAssessment(candidate, coherenceAssessment());

          assert.equal(result.ok, false, `${state} should reject the assessment`);
          if (result.ok) continue;

          assert.equal(result.error.code, "STATE_NOT_ELIGIBLE");
          assert.equal(result.error.currentState, state);
          assert.equal(candidate.state, state);
          assert.equal(candidate.coherenceAssessment, undefined);
        }
      });

      it("rejects out-of-range coherence note and confidence", () => {
        const candidate = candidateInState("VALIDO");

        for (const note of [16, -1]) {
          const result = recordCoherenceAssessment(candidate, coherenceAssessment({ note }));

          assert.equal(result.ok, false, `note ${note} should be rejected`);
          if (result.ok) continue;

          assert.equal(result.error.code, "INVALID_NOTE");
          assert.equal(result.error.note, note);
        }

        for (const confidence of [1.5, -0.1]) {
          const result = recordCoherenceAssessment(
            candidate,
            coherenceAssessment({ confidence }),
          );

          assert.equal(result.ok, false, `confidence ${confidence} should be rejected`);
          if (result.ok) continue;

          assert.equal(result.error.code, "INVALID_CONFIDENCE");
          assert.equal(result.error.confidence, confidence);
        }
      });
    });

    describe("transition schema", () => {
      it("rejects malformed coherence transitions", () => {
        const candidate = candidateInState("VALIDO");

        const missingStep = recordCoherenceAssessment(
          candidate,
          coherenceAssessment({
            transitions: coherenceAssessment().transitions.filter((transition) => transition.from !== "V2"),
          }),
        );

        assert.equal(missingStep.ok, false);
        if (!missingStep.ok) {
          assert.equal(missingStep.error.code, "INVALID_TRANSITION");
        }

        const wrongOrder = recordCoherenceAssessment(
          candidate,
          coherenceAssessment({
            transitions: [
              coherenceAssessment().transitions[1],
              coherenceAssessment().transitions[0],
              coherenceAssessment().transitions[2],
            ],
          }),
        );

        assert.equal(wrongOrder.ok, false);
        if (!wrongOrder.ok) {
          assert.equal(wrongOrder.error.code, "INVALID_TRANSITION");
        }

        const emptyRelation = recordCoherenceAssessment(
          candidate,
          coherenceAssessment({
            transitions: [
              {
                from: "V1" as VerseSlot,
                to: "V2" as VerseSlot,
                relation: "   ",
                evidence: "el gato sigue siendo el sujeto",
              },
              coherenceAssessment().transitions[1],
              coherenceAssessment().transitions[2],
            ],
          }),
        );

        assert.equal(emptyRelation.ok, false);
        if (!emptyRelation.ok) {
          assert.equal(emptyRelation.error.code, "INVALID_TRANSITION");
        }

        const emptyEvidence = recordCoherenceAssessment(
          candidate,
          coherenceAssessment({
            transitions: [
              {
                from: "V1" as VerseSlot,
                to: "V2" as VerseSlot,
                relation: "continuidad de referente",
                evidence: "",
              },
              coherenceAssessment().transitions[1],
              coherenceAssessment().transitions[2],
            ],
          }),
        );

        assert.equal(emptyEvidence.ok, false);
        if (!emptyEvidence.ok) {
          assert.equal(emptyEvidence.error.code, "INVALID_TRANSITION");
        }
      });
    });
});

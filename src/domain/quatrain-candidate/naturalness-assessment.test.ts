import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  recordNaturalnessAssessment,
  type NaturalnessAssessmentRecord,
  type QuatrainCandidate,
  type VerseSlot,
} from "./index.js";
import { candidateInState, naturalnessAssessment } from "./test-fixtures.js";

describe("naturalness assessment", () => {
    describe("recording", () => {
      it("records a naturalness assessment without changing state or hard validation results", () => {
        const candidate = candidateInState("VALIDO");
        const result = recordNaturalnessAssessment(candidate, naturalnessAssessment());

        assert.equal(result.ok, true);
        if (!result.ok) throw new Error("Expected successful result in test");

        assert.equal(result.value.state, "VALIDO");
        assert.equal(result.value.plan, candidate.plan);
        assert.equal(result.value.provenance, candidate.provenance);
        assert.equal(result.value.validationCompletion, candidate.validationCompletion);
        assert.deepEqual(result.value.rejections, candidate.rejections);
        assert.equal(result.value.score, candidate.score);
        assert.deepEqual(result.value.naturalnessAssessment, naturalnessAssessment());
        assert.equal(result.value.events.at(-1)?.type, "NATURALNESS_RECORDED");
        assert.deepEqual(
          result.value.events.at(-1)?.naturalnessAssessment,
          result.value.naturalnessAssessment,
        );
        assert.equal(Object.isFrozen(result.value), true);
        assert.equal(Object.isFrozen(result.value.naturalnessAssessment), true);
        assert.equal(Object.isFrozen(result.value.naturalnessAssessment?.observations), true);
      });
    });

    describe("eligibility and bounds", () => {
      it("rejects naturalness assessment when a hard blocker is present", () => {
        const blockedStates: readonly QuatrainCandidate["state"][] = [
          "GENERADO",
          "VALIDACION_PENDIENTE",
          "RECHAZADO",
        ];

        for (const state of blockedStates) {
          const candidate = candidateInState(state);
          const result = recordNaturalnessAssessment(candidate, naturalnessAssessment());

          assert.equal(result.ok, false, `${state} should reject the assessment`);
          if (result.ok) continue;

          assert.equal(result.error.code, "STATE_NOT_ELIGIBLE");
          assert.equal(result.error.currentState, state);
          assert.equal(candidate.state, state);
          assert.equal(candidate.naturalnessAssessment, undefined);
        }
      });

      it("rejects out-of-range naturalness note and confidence", () => {
        const candidate = candidateInState("VALIDO");

        for (const note of [21, -1]) {
          const result = recordNaturalnessAssessment(candidate, naturalnessAssessment({ note }));

          assert.equal(result.ok, false, `note ${note} should be rejected`);
          if (result.ok) continue;

          assert.equal(result.error.code, "INVALID_NOTE");
          assert.equal(result.error.note, note);
        }

        for (const confidence of [1.5, -0.1]) {
          const result = recordNaturalnessAssessment(
            candidate,
            naturalnessAssessment({ confidence }),
          );

          assert.equal(result.ok, false, `confidence ${confidence} should be rejected`);
          if (result.ok) continue;

          assert.equal(result.error.code, "INVALID_CONFIDENCE");
          assert.equal(result.error.confidence, confidence);
        }
      });
    });

    describe("observation schema", () => {
      it("rejects malformed naturalness observations", () => {
        const candidate = candidateInState("VALIDO");

        const invalidSlot = recordNaturalnessAssessment(
          candidate,
          naturalnessAssessment({
            observations: [{ slot: "V5" as VerseSlot, fragment: "hola", reason: "raro" }],
          }),
        );

        assert.equal(invalidSlot.ok, false);
        if (!invalidSlot.ok) {
          assert.equal(invalidSlot.error.code, "INVALID_OBSERVATION");
          assert.equal(invalidSlot.error.path, "$.observations[0]");
        }

        const emptyFragment = recordNaturalnessAssessment(
          candidate,
          naturalnessAssessment({
            observations: [{ slot: "V3", fragment: "   ", reason: "raro" }],
          }),
        );

        assert.equal(emptyFragment.ok, false);
        if (!emptyFragment.ok) {
          assert.equal(emptyFragment.error.code, "INVALID_OBSERVATION");
        }

        const emptyReason = recordNaturalnessAssessment(
          candidate,
          naturalnessAssessment({
            observations: [{ slot: "V3", fragment: "hola", reason: "" }],
          }),
        );

        assert.equal(emptyReason.ok, false);
        if (!emptyReason.ok) {
          assert.equal(emptyReason.error.code, "INVALID_OBSERVATION");
        }

        const duplicateSlot = recordNaturalnessAssessment(
          candidate,
          naturalnessAssessment({
            observations: [
              { slot: "V3", fragment: "hola", reason: "raro" },
              { slot: "V3", fragment: "adios", reason: "forzado" },
            ],
          }),
        );

        assert.equal(duplicateSlot.ok, false);
        if (!duplicateSlot.ok) {
          assert.equal(duplicateSlot.error.code, "INVALID_OBSERVATION");
          assert.equal(duplicateSlot.error.path, "$.observations[1]");
        }
      });
    });
});

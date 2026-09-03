import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  recordRipioDetection,
  type QuatrainCandidate,
  type RipioDetectionRecord,
  type RipioSeverity,
  type VerseSlot,
} from "./index.js";
import { candidateInState, ripioDetection } from "./test-fixtures.js";

describe("ripio detection", () => {
    describe("recording", () => {
      it("records a ripio detection without changing state or hard validation results", () => {
        const candidate = candidateInState("VALIDO");
        const result = recordRipioDetection(candidate, ripioDetection());

        assert.equal(result.ok, true);
        if (!result.ok) throw new Error("Expected successful result in test");

        assert.equal(result.value.state, "VALIDO");
        assert.equal(result.value.plan, candidate.plan);
        assert.equal(result.value.provenance, candidate.provenance);
        assert.equal(result.value.validationCompletion, candidate.validationCompletion);
        assert.deepEqual(result.value.rejections, candidate.rejections);
        assert.deepEqual(result.value.ripioDetection, ripioDetection());
        assert.equal(result.value.events.at(-1)?.type, "RIPIO_DETECTION_RECORDED");
        assert.deepEqual(result.value.events.at(-1)?.ripioDetection, result.value.ripioDetection);
        assert.equal(Object.isFrozen(result.value), true);
        assert.equal(Object.isFrozen(result.value.ripioDetection), true);
        assert.equal(Object.isFrozen(result.value.ripioDetection?.fragments), true);
        assert.equal(Object.isFrozen(result.value.ripioDetection?.signals), true);
        assert.equal(Object.isFrozen(result.value.ripioDetection?.llm.fragments), true);
      });
    });

    describe("eligibility and consistency", () => {
      it("rejects ripio detection when a hard blocker is present", () => {
        const blockedStates: readonly QuatrainCandidate["state"][] = [
          "GENERADO",
          "VALIDACION_PENDIENTE",
          "RECHAZADO",
        ];

        for (const state of blockedStates) {
          const candidate = candidateInState(state);
          const result = recordRipioDetection(candidate, ripioDetection());

          assert.equal(result.ok, false, `${state} should reject the detection`);
          if (result.ok) continue;

          assert.equal(result.error.code, "STATE_NOT_ELIGIBLE");
          assert.equal(result.error.currentState, state);
          assert.equal(candidate.state, state);
          assert.equal(candidate.ripioDetection, undefined);
        }
      });

      it("rejects inconsistent ripio presence relative to severity", () => {
        const candidate = candidateInState("VALIDO");

        const severityNoneWithPresence = recordRipioDetection(
          candidate,
          ripioDetection({ severity: "NINGUNO", presence: true }),
        );

        assert.equal(severityNoneWithPresence.ok, false);
        if (!severityNoneWithPresence.ok) {
          assert.equal(severityNoneWithPresence.error.code, "INCONSISTENT_PRESENCE");
        }

        const severityLeveWithoutPresence = recordRipioDetection(
          candidate,
          ripioDetection({ severity: "LEVE", presence: false }),
        );

        assert.equal(severityLeveWithoutPresence.ok, false);
        if (!severityLeveWithoutPresence.ok) {
          assert.equal(severityLeveWithoutPresence.error.code, "INCONSISTENT_PRESENCE");
        }
      });

      it("rejects unrecognized ripio severity", () => {
        const candidate = candidateInState("VALIDO");
        const result = recordRipioDetection(
          candidate,
          ripioDetection({ severity: "ENORME" as RipioSeverity }),
        );

        assert.equal(result.ok, false);
        if (!result.ok) {
          assert.equal(result.error.code, "INVALID_SEVERITY");
        }
      });
    });

    describe("diagnostic schema", () => {
      it("rejects malformed ripio fragments, signals and LLM verdict", () => {
        const candidate = candidateInState("VALIDO");

        const invalidFragmentSlot = recordRipioDetection(
          candidate,
          ripioDetection({
            fragments: [{ slot: "V5" as VerseSlot, fragment: "hola", reason: "raro" }],
          }),
        );

        assert.equal(invalidFragmentSlot.ok, false);
        if (!invalidFragmentSlot.ok) {
          assert.equal(invalidFragmentSlot.error.code, "INVALID_FRAGMENT");
        }

        const invalidSignal = recordRipioDetection(
          candidate,
          ripioDetection({
            signals: [
              {
                patternId: "",
                patternVersion: "0.1.0",
                slot: "V3",
                fragment: "es que",
                severity: "LEVE",
                reason: "relleno",
              },
            ],
          }),
        );

        assert.equal(invalidSignal.ok, false);
        if (!invalidSignal.ok) {
          assert.equal(invalidSignal.error.code, "INVALID_SIGNAL");
        }

        const invalidLlmConfidence = recordRipioDetection(
          candidate,
          ripioDetection({
            llm: {
              severity: "NINGUNO",
              confidence: 2,
              fragments: [],
              explanation: "nada",
            },
          }),
        );

        assert.equal(invalidLlmConfidence.ok, false);
        if (!invalidLlmConfidence.ok) {
          assert.equal(invalidLlmConfidence.error.code, "INVALID_LLM");
          assert.equal(invalidLlmConfidence.error.path, "$.llm.confidence");
        }
      });
    });
});

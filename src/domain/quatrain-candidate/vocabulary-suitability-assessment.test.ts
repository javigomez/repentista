import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  recordVocabularySuitabilityAssessment,
  type QuatrainCandidate,
  type VocabularySuitabilityAssessmentRecord,
} from "./index.js";
import {
  candidateInState,
  vocabularySuitabilityAssessment,
} from "./test-fixtures.js";

describe("vocabulary suitability assessment", () => {
    describe("recording", () => {
      it("records a vocabulary suitability assessment without changing state", () => {
        const candidate = candidateInState("VALIDO");
        const result = recordVocabularySuitabilityAssessment(
          candidate,
          vocabularySuitabilityAssessment(),
        );

        assert.equal(result.ok, true);
        if (!result.ok) throw new Error("Expected successful result in test");

        assert.equal(result.value.state, "VALIDO");
        assert.equal(result.value.plan, candidate.plan);
        assert.equal(result.value.provenance, candidate.provenance);
        assert.equal(result.value.validationCompletion, candidate.validationCompletion);
        assert.deepEqual(result.value.rejections, candidate.rejections);
        assert.equal(result.value.score, candidate.score);
        assert.deepEqual(result.value.vocabularySuitabilityAssessment, vocabularySuitabilityAssessment());
        assert.equal(result.value.events.at(-1)?.type, "VOCABULARY_SUITABILITY_RECORDED");
        assert.deepEqual(
          result.value.events.at(-1)?.vocabularySuitabilityAssessment,
          result.value.vocabularySuitabilityAssessment,
        );
        assert.equal(Object.isFrozen(result.value), true);
        assert.equal(Object.isFrozen(result.value.vocabularySuitabilityAssessment), true);
        assert.equal(Object.isFrozen(result.value.vocabularySuitabilityAssessment?.wordMetadata), true);
        assert.equal(Object.isFrozen(result.value.vocabularySuitabilityAssessment?.flaggedWords), true);
      });
    });

    describe("eligibility and bounds", () => {
      it("rejects vocabulary assessment when a hard blocker is present", () => {
        const blockedStates: readonly QuatrainCandidate["state"][] = [
          "GENERADO",
          "VALIDACION_PENDIENTE",
          "RECHAZADO",
        ];

        for (const state of blockedStates) {
          const candidate = candidateInState(state);
          const result = recordVocabularySuitabilityAssessment(
            candidate,
            vocabularySuitabilityAssessment(),
          );

          assert.equal(result.ok, false, `${state} should reject the assessment`);
          if (result.ok) continue;

          assert.equal(result.error.code, "STATE_NOT_ELIGIBLE");
          assert.equal(result.error.currentState, state);
          assert.equal(candidate.state, state);
          assert.equal(candidate.vocabularySuitabilityAssessment, undefined);
        }
      });

      it("rejects out-of-range vocabulary note and confidence", () => {
        const candidate = candidateInState("VALIDO");

        for (const note of [11, -1]) {
          const result = recordVocabularySuitabilityAssessment(
            candidate,
            vocabularySuitabilityAssessment({ note }),
          );

          assert.equal(result.ok, false, `note ${note} should be rejected`);
          if (result.ok) continue;

          assert.equal(result.error.code, "INVALID_NOTE");
          assert.equal(result.error.note, note);
        }

        for (const confidence of [1.5, -0.1]) {
          const result = recordVocabularySuitabilityAssessment(
            candidate,
            vocabularySuitabilityAssessment({ confidence }),
          );

          assert.equal(result.ok, false, `confidence ${confidence} should be rejected`);
          if (result.ok) continue;

          assert.equal(result.error.code, "INVALID_CONFIDENCE");
          assert.equal(result.error.confidence, confidence);
        }
      });
    });

    describe("metadata", () => {
      it("rejects invalid vocabulary flagged words and metadata", () => {
        const candidate = candidateInState("VALIDO");

        const invalidIssue = recordVocabularySuitabilityAssessment(
          candidate,
          vocabularySuitabilityAssessment({
            flaggedWords: [
              {
                slot: "V4",
                form: "balcón",
                issue: "RARO" as VocabularySuitabilityAssessmentRecord["flaggedWords"][number]["issue"],
                reason: "motivo",
                alternatives: ["terraza"],
              },
            ],
          }),
        );

        assert.equal(invalidIssue.ok, false);
        if (!invalidIssue.ok) {
          assert.equal(invalidIssue.error.code, "INVALID_VOCABULARY_FIELD");
          assert.equal(invalidIssue.error.path, "$.flaggedWords");
        }

        const invalidMetadata = recordVocabularySuitabilityAssessment(
          candidate,
          vocabularySuitabilityAssessment({
            wordMetadata: [
              {
                slot: "V4",
                form: "balcón",
                normalizedForm: "balcon",
                dictionaryLevel: "   ",
              },
            ],
          }),
        );

        assert.equal(invalidMetadata.ok, false);
        if (!invalidMetadata.ok) {
          assert.equal(invalidMetadata.error.code, "INVALID_VOCABULARY_FIELD");
          assert.equal(invalidMetadata.error.path, "$.wordMetadata");
        }
      });
    });
});

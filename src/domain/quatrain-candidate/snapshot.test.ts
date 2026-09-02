import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createQuatrainCandidateWithCollaborators,
  recordCandidateRepair,
  toQuatrainCandidateSnapshot,
  type CandidateRepairInput,
  type QuatrainCandidate,
} from "./index.js";
import {
  applyTransition,
  CREATED_AT,
  candidateFactoryInput,
  candidateInState,
  completePlan,
  provenance,
  VALIDATION_STARTED_AT,
  validationRequestedTransition,
} from "./test-fixtures.js";
import { fixedClock, sequenceDouble } from "../../testing/test-doubles.js";

describe("quatrain candidate snapshots", () => {
    describe("deterministic serialization", () => {
      it("serializes stable JSON snapshots from fixed doubles", () => {
        const createWithFixedDoubles = (): QuatrainCandidate => {
          const result = createQuatrainCandidateWithCollaborators(candidateFactoryInput(), {
            nextCandidateId: sequenceDouble(["candidate-fixed-001"]),
            now: fixedClock(CREATED_AT),
          });

          assert.equal(result.ok, true);
          if (!result.ok) {
            throw new Error("Expected deterministic candidate creation to succeed");
          }

          return applyTransition(result.value, validationRequestedTransition());
        };

        const firstSnapshot = toQuatrainCandidateSnapshot(createWithFixedDoubles());
        const secondSnapshot = toQuatrainCandidateSnapshot(createWithFixedDoubles());

        assert.deepEqual(firstSnapshot, secondSnapshot);
        assert.deepEqual(JSON.parse(JSON.stringify(firstSnapshot)), firstSnapshot);
        assert.deepEqual(firstSnapshot, {
          schemaVersion: "quatrain-candidate-snapshot/v1",
          id: "candidate-fixed-001",
          batchId: "batch-001",
          state: "VALIDACION_PENDIENTE",
          brief: {
            context: "Un gato promete compartir la merienda",
            tone: "absurdo y cercano",
            candidateCount: 100,
            topK: 5,
            minimumScore: 80,
            scheme: "0-A-0-A",
            rhyme: "consonant",
            metricPositions: 7,
          },
          plan: completePlan(),
          provenance: provenance(),
          events: [
            {
              type: "CANDIDATE_CREATED",
              at: CREATED_AT,
            },
            {
              type: "VALIDATION_REQUESTED",
              at: VALIDATION_STARTED_AT,
              validators: [
                { name: "metric", version: "metric-0.1.0" },
                { name: "rhyme", version: "rhyme-0.1.0" },
                { name: "lexicon", version: "lexicon-0.1.0" },
              ],
            },
          ],
          rejections: [],
          repairs: [],
          validationRequest: {
            at: VALIDATION_STARTED_AT,
            validators: [
              { name: "metric", version: "metric-0.1.0" },
              { name: "rhyme", version: "rhyme-0.1.0" },
              { name: "lexicon", version: "lexicon-0.1.0" },
            ],
          },
        });
      });
    });

    describe("history serialization", () => {
      it("serializes rejection and repair history without sharing mutable arrays", () => {
        const rejected = candidateInState("RECHAZADO");
        const repair: CandidateRepairInput = {
          at: "2026-08-30T09:22:00.000Z",
          repairedBy: "writer-repair",
          sourceRejectionPointer: "/validation/metric/V3",
          changes: [
            {
              slot: "V3",
              before: "se distrae con hambre repentina",
              after: "se despista con su hambre",
            },
          ],
          prompt: { id: "repair-metric-verse", version: "prompt-0.1.0" },
          model: { provider: "openai", name: "gpt-5", version: "2026-08-30" },
        };
        const repaired = recordCandidateRepair(rejected, repair);

        assert.equal(repaired.ok, true);
        if (!repaired.ok) throw new Error("Expected successful result in test");

        const snapshot = toQuatrainCandidateSnapshot(repaired.value);

        assert.equal(snapshot.state, "RECHAZADO");
        assert.deepEqual(snapshot.rejections, repaired.value.rejections);
        assert.deepEqual(snapshot.repairs, [repair]);
        assert.equal(snapshot.events.at(-1)?.type, "REPAIR_RECORDED");
        assert.notEqual(snapshot.events, repaired.value.events);
        assert.notEqual(snapshot.repairs, repaired.value.repairs);
        assert.deepEqual(JSON.parse(JSON.stringify(snapshot)), snapshot);
      });
    });
});

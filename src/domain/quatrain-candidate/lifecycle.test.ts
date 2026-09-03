import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createQuatrainCandidate,
  createQuatrainCandidateWithCollaborators,
  hasPassedHardValidation,
  recordCandidateRepair,
  transitionQuatrainCandidate,
  type CandidateLifecycleTransitionInput,
  type CandidateRepairInput,
  type QuatrainCandidate,
} from "./index.js";
import {
  applyTransition,
  CREATED_AT,
  candidateFactoryInput,
  candidateInState,
  candidateInput,
  completePlan,
  editorialApprovedTransition,
  editorialRejectedTransition,
  exportedTransition,
  finalistSelectedTransition,
  hardValidationPassedTransition,
  hardValidationRejectedTransition,
  thresholdFailedTransition,
  validScoreTransition,
  validationRequestedTransition,
} from "./test-fixtures.js";
import { fixedClock, sequenceDouble } from "../../testing/test-doubles.js";

describe("quatrain candidate lifecycle", () => {
    describe("creation and history", () => {
      it("creates a complete auditable candidate with four ordered verse slots", () => {
        const input = candidateInput();

        const result = createQuatrainCandidate(input);

        assert.equal(result.ok, true);
        if (!result.ok) throw new Error("Expected successful result in test");

        assert.equal(result.value.id, "candidate-001");
        assert.equal(result.value.batchId, "batch-001");
        assert.equal(result.value.state, "GENERADO");
        assert.equal(result.value.brief, input.brief);
        assert.deepEqual(
          result.value.plan.slots.map((slot) => slot.slot),
          ["V1", "V2", "V3", "V4"],
        );
        assert.deepEqual(
          result.value.plan.slots.map((slot) => slot.role),
          ["PRESENTACION", "PREPARACION", "GIRO_TENSION", "REMATE"],
        );
        assert.deepEqual(
          result.value.plan.slots.map((slot) => slot.plannedFinalWord),
          ["vecino", "melón", "camino", "jamón"],
        );
        assert.deepEqual(result.value.provenance, input.provenance);
        assert.equal(Object.isFrozen(result.value), true);
        assert.equal(Object.isFrozen(result.value.plan), true);
        assert.equal(Object.isFrozen(result.value.plan.slots), true);
        assert.equal(Object.isFrozen(result.value.provenance), true);
      });

      it("rejects incomplete candidates and reports the missing verse slot", () => {
        const result = createQuatrainCandidate(
          candidateInput({
            plan: completePlan({
              slots: completePlan().slots.filter((slot) => slot.slot !== "V3"),
            }),
          }),
        );

        assert.equal(result.ok, false);
        if (result.ok) return;

        const slotError = result.errors.find((error) => error.code === "INCOMPLETE_VERSE_SLOTS");

        assert.equal(slotError?.field, "plan.slots");
        assert.deepEqual(slotError?.missingSlots, ["V3"]);
        assert.deepEqual(slotError?.receivedSlots, ["V1", "V2", "V4"]);
      });

      it("rejects verse roles that do not match the fixed slot contract", () => {
        const result = createQuatrainCandidate(
          candidateInput({
            plan: completePlan({
              slots: completePlan().slots.map((slot) =>
                slot.slot === "V4" ? { ...slot, role: "GIRO_TENSION" } : slot,
              ),
            }),
          }),
        );

        assert.equal(result.ok, false);
        if (result.ok) return;

        const roleError = result.errors.find((error) => error.code === "INVALID_VERSE_ROLE");

        assert.equal(roleError?.field, "plan.slots");
        assert.equal(roleError?.slot, "V4");
        assert.equal(roleError?.expectedRole, "REMATE");
        assert.equal(roleError?.receivedRole, "GIRO_TENSION");
      });
    });

    describe("state transitions", () => {
      it("accepts only declared lifecycle transitions and leaves the source candidate unchanged", () => {
        const allowedTransitions: readonly {
          readonly from: QuatrainCandidate["state"];
          readonly transition: CandidateLifecycleTransitionInput;
          readonly to: QuatrainCandidate["state"];
        }[] = [
          {
            from: "GENERADO",
            transition: validationRequestedTransition(),
            to: "VALIDACION_PENDIENTE",
          },
          {
            from: "VALIDACION_PENDIENTE",
            transition: hardValidationPassedTransition(),
            to: "VALIDO",
          },
          {
            from: "VALIDACION_PENDIENTE",
            transition: hardValidationRejectedTransition(),
            to: "RECHAZADO",
          },
          {
            from: "VALIDO",
            transition: validScoreTransition(),
            to: "PUNTUADO",
          },
          {
            from: "PUNTUADO",
            transition: thresholdFailedTransition(),
            to: "BAJO_UMBRAL",
          },
          {
            from: "PUNTUADO",
            transition: finalistSelectedTransition(),
            to: "SELECCIONADO",
          },
          {
            from: "SELECCIONADO",
            transition: editorialApprovedTransition(),
            to: "APROBADO",
          },
          {
            from: "SELECCIONADO",
            transition: editorialRejectedTransition(),
            to: "RECHAZADO_EDITORIAL",
          },
          {
            from: "APROBADO",
            transition: exportedTransition(),
            to: "EXPORTADO",
          },
        ];

        for (const scenario of allowedTransitions) {
          const candidate = candidateInState(scenario.from);
          const result = transitionQuatrainCandidate(candidate, scenario.transition);

          assert.equal(
            result.ok,
            true,
            `${scenario.from} should accept ${scenario.transition.type}`,
          );
          if (!result.ok) continue;

          assert.equal(result.value.state, scenario.to, scenario.transition.type);
          assert.equal(candidate.state, scenario.from, "transitions return a new immutable value");
          assert.equal(result.value.events.at(-1)?.type, scenario.transition.type);
          assert.equal(Object.isFrozen(result.value), true);
          assert.equal(Object.isFrozen(result.value.events), true);
        }
      });

      it("rejects scoring before hard validation succeeds with the current state and missing prerequisite", () => {
        const forbiddenStates: readonly QuatrainCandidate["state"][] = [
          "GENERADO",
          "VALIDACION_PENDIENTE",
          "RECHAZADO",
        ];

        for (const state of forbiddenStates) {
          const candidate = candidateInState(state);
          const result = transitionQuatrainCandidate(candidate, validScoreTransition());

          assert.equal(result.ok, false, `${state} should reject scoring`);
          if (result.ok) continue;

          assert.equal(result.error.code, "INVALID_TRANSITION");
          assert.equal(result.error.currentState, state);
          assert.equal(result.error.requestedTransition, "SCORE_RECORDED");
          assert.deepEqual(result.error.missingPrerequisites, ["VALIDO"]);
          assert.equal(candidate.state, state);
        }
      });
    });

    describe("rejection evidence and repairs", () => {
      it("keeps validator rejection evidence localizable and append-only in the event history", () => {
        const pending = candidateInState("VALIDACION_PENDIENTE");
        const result = transitionQuatrainCandidate(pending, hardValidationRejectedTransition());

        assert.equal(result.ok, true);
        if (!result.ok) throw new Error("Expected successful result in test");

        assert.equal(result.value.state, "RECHAZADO");
        assert.deepEqual(result.value.rejections, [
          {
            validator: "metric",
            version: "metric-0.1.0",
            reason: "V3 requiere hiato artificial para llegar a siete posiciones.",
            evidence: {
              pointer: "/validation/metric/V3",
              excerpt: "se distrae con hambre repentina",
            },
          },
        ]);
        assert.equal(result.value.events.at(-1)?.type, "HARD_VALIDATION_REJECTED");
        assert.deepEqual(result.value.events.at(-1)?.rejection, result.value.rejections[0]);
        assert.equal(Object.isFrozen(result.value.rejections), true);
        assert.equal(Object.isFrozen(result.value.rejections[0]), true);
      });

      it("records repairs as immutable history without overwriting prior attempts", () => {
        const rejected = candidateInState("RECHAZADO");
        const firstRepair: CandidateRepairInput = {
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
        const secondRepair: CandidateRepairInput = {
          at: "2026-08-30T09:23:00.000Z",
          repairedBy: "writer-repair",
          sourceRejectionPointer: "/validation/metric/V3",
          changes: [
            {
              slot: "V3",
              before: "se despista con su hambre",
              after: "se queda con hambre y tino",
            },
          ],
          prompt: { id: "repair-metric-verse", version: "prompt-0.1.1" },
          model: { provider: "openai", name: "gpt-5", version: "2026-08-30" },
        };

        const repairedOnce = recordCandidateRepair(rejected, firstRepair);

        assert.equal(repairedOnce.ok, true);
        if (!repairedOnce.ok) throw new Error("Expected successful result in test");

        const repairedTwice = recordCandidateRepair(repairedOnce.value, secondRepair);

        assert.equal(repairedTwice.ok, true);
        if (!repairedTwice.ok) throw new Error("Expected successful result in test");

        assert.deepEqual(rejected.repairs, []);
        assert.deepEqual(
          repairedOnce.value.repairs.map((repair) => repair.prompt.version),
          ["prompt-0.1.0"],
        );
        assert.deepEqual(
          repairedTwice.value.repairs.map((repair) => repair.prompt.version),
          ["prompt-0.1.0", "prompt-0.1.1"],
        );
        assert.deepEqual(repairedTwice.value.repairs[0], firstRepair);
        assert.deepEqual(repairedTwice.value.repairs[1], secondRepair);
        assert.equal(Object.isFrozen(repairedTwice.value.repairs), true);
        assert.equal(Object.isFrozen(repairedTwice.value.repairs[0]), true);
      });
    });

    describe("deterministic collaborators", () => {
      it("creates candidates with deterministic ID and clock collaborators", () => {
        const input = candidateFactoryInput();
        const collaborators = {
          nextCandidateId: sequenceDouble(["candidate-fixed-001"]),
          now: fixedClock(CREATED_AT),
        };

        const result = createQuatrainCandidateWithCollaborators(input, collaborators);

        assert.equal(result.ok, true);
        if (!result.ok) throw new Error("Expected successful result in test");

        assert.equal(result.value.id, "candidate-fixed-001");
        assert.equal(result.value.provenance.createdAt, CREATED_AT);
        assert.deepEqual(result.value.provenance.generator, input.provenance.generator);
        assert.equal(result.value.events[0]?.at, CREATED_AT);
      });
    });
});

describe("hard-validation status", () => {
    describe("state eligibility", () => {
      it("identifies states that have already passed hard validation", () => {
        const passed = [
          "VALIDO",
          "PUNTUADO",
          "BAJO_UMBRAL",
          "SELECCIONADO",
          "APROBADO",
          "RECHAZADO_EDITORIAL",
          "EXPORTADO",
        ] as const;
        const blocked = ["GENERADO", "VALIDACION_PENDIENTE", "RECHAZADO"] as const;

        for (const state of passed) {
          assert.equal(hasPassedHardValidation(state), true, `${state} should count as validated`);
        }

        for (const state of blocked) {
          assert.equal(hasPassedHardValidation(state), false, `${state} should count as blocked`);
        }
      });
    });
});

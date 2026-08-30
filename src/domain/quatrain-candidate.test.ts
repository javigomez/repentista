import test from "node:test";
import assert from "node:assert/strict";

import {
  createGenerationBrief,
  type GenerationBrief,
} from "./generation-brief/index.js";
import {
  createQuatrainCandidate,
  type CandidatePlanInput,
  type CandidateProvenanceInput,
  type QuatrainCandidateInput,
} from "./quatrain-candidate/index.js";

const CREATED_AT = "2026-08-30T09:15:00.000Z";

function validBrief(): GenerationBrief {
  const result = createGenerationBrief({
    context: "Un gato promete compartir la merienda",
    tone: "absurdo y cercano",
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error("Expected valid brief fixture");
  }

  return result.value;
}

function completePlan(overrides: Partial<CandidatePlanInput> = {}): CandidatePlanInput {
  return {
    rhymeScheme: "0-A-0-A",
    metricPositions: 7,
    slots: [
      {
        slot: "V1",
        role: "PRESENTACION",
        semanticAnchor: "presenta al gato y la merienda",
        plannedFinalWord: "vecino",
      },
      {
        slot: "V2",
        role: "PREPARACION",
        semanticAnchor: "promete guardar pan para otro",
        plannedFinalWord: "melón",
      },
      {
        slot: "V3",
        role: "GIRO_TENSION",
        semanticAnchor: "se distrae con hambre repentina",
        plannedFinalWord: "camino",
      },
      {
        slot: "V4",
        role: "REMATE",
        semanticAnchor: "confiesa que compartió solo el olor",
        plannedFinalWord: "jamón",
      },
    ],
    ...overrides,
  };
}

function provenance(overrides: Partial<CandidateProvenanceInput> = {}): CandidateProvenanceInput {
  return {
    createdAt: CREATED_AT,
    generator: {
      name: "QuatrainGenerator",
      version: "0.1.0",
    },
    prompt: {
      id: "writer-from-punchline",
      version: "prompt-0.1.0",
    },
    model: {
      provider: "openai",
      name: "gpt-5",
      version: "2026-08-30",
    },
    ...overrides,
  };
}

function candidateInput(overrides: Partial<QuatrainCandidateInput> = {}): QuatrainCandidateInput {
  return {
    id: "candidate-001",
    batchId: "batch-001",
    brief: validBrief(),
    plan: completePlan(),
    provenance: provenance(),
    ...overrides,
  };
}

test("creates a complete auditable candidate with four ordered verse slots", () => {
  const input = candidateInput();

  const result = createQuatrainCandidate(input);

  assert.equal(result.ok, true);
  if (!result.ok) return;

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

test("rejects incomplete candidates and reports the missing verse slot", () => {
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

test("rejects verse roles that do not match the fixed slot contract", () => {
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

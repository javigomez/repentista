import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createSoftQualityRepairRequest,
  type SoftQualityRepairRequest,
} from "./index.js";

describe("constrained soft-quality repair request", () => {
  const baseRequest = (): SoftQualityRepairRequest => ({
    candidateId: "candidate-001",
    dimension: "NATURALIDAD",
    diagnosis: {
      code: "FORMULACION_FORZADA",
      message: "V3 suena poco natural.",
      evidence: [{ pointer: "/assessment/naturalness/V3", summary: "frase rígida" }],
    },
    editableSlots: ["V3"],
    immutableSlots: ["V1", "V2", "V4"],
    invariants: {
      finalWords: { V1: "vecino", V2: "melón", V3: "camino", V4: "jamón" },
      rhymeScheme: "0-A-0-A",
      metricPositions: 7,
    },
    attempt: 1,
    maxAttempts: 3,
  });

  it("requires exactly one soft-quality dimension and explicit edit permissions", () => {
    const result = createSoftQualityRepairRequest(baseRequest());

    assert.equal(result.ok, true);
    if (!result.ok) throw new Error(`Expected valid request: ${result.error.message}`);
    assert.equal(result.value.dimension, "NATURALIDAD");
    assert.deepEqual(result.value.editableSlots, ["V3"]);
    assert.deepEqual(result.value.immutableSlots, ["V1", "V2", "V4"]);
  });

  it("rejects a scope that can edit an immutable slot or omit an editable slot", () => {
    const result = createSoftQualityRepairRequest({
      ...baseRequest(),
      editableSlots: ["V2", "V3"],
      immutableSlots: ["V1", "V2", "V4"],
    });

    assert.equal(result.ok, false);
    if (result.ok) throw new Error("Expected conflicting repair permissions to fail");
    assert.equal(result.error.code, "INVALID_EDIT_SCOPE");
    assert.match(result.error.message, /V2/);
  });

  it("preserves hard constraints as immutable invariants", () => {
    const result = createSoftQualityRepairRequest({
      ...baseRequest(),
      invariants: {
        ...baseRequest().invariants,
        rhymeScheme: "ABAB",
        metricPositions: 8,
      },
    });

    assert.equal(result.ok, false);
    if (result.ok) throw new Error("Expected unsupported hard constraints to fail");
    assert.equal(result.error.code, "INVALID_HARD_INVARIANT");
  });

  it("rejects a request that mixes multiple incompatible dimensions", () => {
    const result = createSoftQualityRepairRequest({
      ...baseRequest(),
      dimension: "NATURALIDAD",
      diagnosis: {
        code: "FORMULACION_FORZADA",
        message: "V3 suena poco natural.",
        evidence: [
          { pointer: "/assessment/naturalness/V3", summary: "frase rígida" },
          { pointer: "/assessment/ripio/V2", summary: "muletilla de relleno" },
        ],
      },
    });

    assert.equal(result.ok, false);
    if (result.ok) throw new Error("Expected mixed-dimension diagnosis to fail");
    assert.equal(result.error.code, "MIXED_DIMENSIONS");
  });

  it("rejects a request with empty editable slots", () => {
    const result = createSoftQualityRepairRequest({
      ...baseRequest(),
      editableSlots: [],
    });

    assert.equal(result.ok, false);
    if (result.ok) throw new Error("Expected empty editable slots to fail");
    assert.equal(result.error.code, "INVALID_EDIT_SCOPE");
  });

  it("rejects a request where editable and immutable slots overlap", () => {
    const result = createSoftQualityRepairRequest({
      ...baseRequest(),
      editableSlots: ["V3"],
      immutableSlots: ["V1", "V3", "V4"],
    });

    assert.equal(result.ok, false);
    if (result.ok) throw new Error("Expected overlapping slots to fail");
    assert.equal(result.error.code, "INVALID_EDIT_SCOPE");
    assert.match(result.error.message, /V3/);
  });

  it("rejects a request with attempt exceeding maxAttempts", () => {
    const result = createSoftQualityRepairRequest({
      ...baseRequest(),
      attempt: 4,
      maxAttempts: 3,
    });

    assert.equal(result.ok, false);
    if (result.ok) throw new Error("Expected attempt exceeding max to fail");
    assert.equal(result.error.code, "ATTEMPT_EXCEEDED");
  });
});

describe("constrained soft-quality repair execution", () => {
  const baseRequest = (): SoftQualityRepairRequest => ({
    candidateId: "candidate-001",
    dimension: "NATURALIDAD",
    diagnosis: {
      code: "FORMULACION_FORZADA",
      message: "V3 suena poco natural.",
      evidence: [{ pointer: "/assessment/naturalness/V3", summary: "frase rígida" }],
    },
    editableSlots: ["V3"],
    immutableSlots: ["V1", "V2", "V4"],
    invariants: {
      finalWords: { V1: "vecino", V2: "melón", V3: "camino", V4: "jamón" },
      rhymeScheme: "0-A-0-A",
      metricPositions: 7,
    },
    attempt: 1,
    maxAttempts: 3,
  });

  it("discards a variant that changes an immutable slot", async () => {
    const request = createSoftQualityRepairRequest(baseRequest());
    if (!request.ok) throw new Error(`Expected valid request: ${request.error.message}`);

    // The repair executor should reject variants that modify immutable slots
    // This test will fail until executeConstrainedRepair is implemented
    const { executeConstrainedRepair } = await import("./index.js");
    const result = await executeConstrainedRepair({
      request: request.value,
      candidate: {
        id: "candidate-001",
        verses: {
          V1: "Mi vecino el gato siempre está",
          V2: "comiendo sin parar su melón",
          V3: "se distrae con hambre repentina",
          V4: "y confiesa que olió el jamón",
        },
      },
      variantGenerator: async () => [{
        verses: {
          V1: "MODIFICADO vecino el gato siempre está", // unauthorized change
          V2: "comiendo sin parar su melón",
          V3: "se distrae con hambre repentina",
          V4: "y confiesa que olió el jamón",
        },
      }],
      hardValidator: async () => ({ ok: true }),
      dimensionEvaluator: async () => ({ note: 18, confidence: 0.9 }),
    });

    assert.equal(result.ok, true);
    if (!result.ok) throw new Error(`Expected repair to succeed: ${result.error.message}`);
    assert.equal(result.value.outcome, "ORIGINAL_PRESERVED");
    assert.equal(result.value.rejectedVariants.length, 1);
    assert.equal(result.value.rejectedVariants[0].reason, "IMMUTABLE_SLOT_CHANGED");
    assert.deepEqual(result.value.rejectedVariants[0].changedSlots, ["V1"]);
  });

  it("discards a variant that breaks hard validation", async () => {
    const request = createSoftQualityRepairRequest(baseRequest());
    if (!request.ok) throw new Error(`Expected valid request: ${request.error.message}`);

    // The repair executor should reject variants that fail hard validation
    // This test will fail until executeConstrainedRepair is implemented
    const { executeConstrainedRepair } = await import("./index.js");
    const result = await executeConstrainedRepair({
      request: request.value,
      candidate: {
        id: "candidate-001",
        verses: {
          V1: "Mi vecino el gato siempre está",
          V2: "comiendo sin parar su melón",
          V3: "se distrae con hambre repentina",
          V4: "y confiesa que olió el jamón",
        },
      },
      variantGenerator: async () => [{
        verses: {
          V1: "Mi vecino el gato siempre está",
          V2: "comiendo sin parar su melón",
          V3: "variante que mejora naturalidad", // improved
          V4: "y confiesa que olió el jamón",
        },
      }],
      hardValidator: async () => ({
        ok: false,
        error: { code: "METRIC_INVALID", message: "V3 no tiene 7 posiciones métricas" },
      }),
      dimensionEvaluator: async () => ({ note: 20, confidence: 0.95 }),
    });

    assert.equal(result.ok, true);
    if (!result.ok) throw new Error(`Expected repair to succeed: ${result.error.message}`);
    assert.equal(result.value.outcome, "ORIGINAL_PRESERVED");
    assert.equal(result.value.rejectedVariants.length, 1);
    assert.equal(result.value.rejectedVariants[0].reason, "HARD_VALIDATION_FAILED");
  });

  it("preserves original when no variant improves the diagnosis", async () => {
    const request = createSoftQualityRepairRequest(baseRequest());
    if (!request.ok) throw new Error(`Expected valid request: ${request.error.message}`);

    // The repair executor should preserve original when no improvement is found
    // This test will fail until executeConstrainedRepair is implemented
    const { executeConstrainedRepair } = await import("./index.js");
    const result = await executeConstrainedRepair({
      request: request.value,
      candidate: {
        id: "candidate-001",
        verses: {
          V1: "Mi vecino el gato siempre está",
          V2: "comiendo sin parar su melón",
          V3: "se distrae con hambre repentina",
          V4: "y confiesa que olió el jamón",
        },
      },
      variantGenerator: async () => [
        {
          verses: {
            V1: "Mi vecino el gato siempre está",
            V2: "comiendo sin parar su melón",
            V3: "otra variante sin mejora", // no improvement
            V4: "y confiesa que olió el jamón",
          },
        },
        {
          verses: {
            V1: "Mi vecino el gato siempre está",
            V2: "comiendo sin parar su melón",
            V3: "tercera variante peor", // worse
            V4: "y confiesa que olió el jamón",
          },
        },
      ],
      hardValidator: async () => ({ ok: true }),
      dimensionEvaluator: async () => ({ note: 15, confidence: 0.8 }), // lower than original
    });

    assert.equal(result.ok, true);
    if (!result.ok) throw new Error(`Expected repair to succeed: ${result.error.message}`);
    assert.equal(result.value.outcome, "ORIGINAL_PRESERVED");
    assert.equal(result.value.attempts.length, 2);
    assert.equal(result.value.attempts[0].improved, false);
    assert.equal(result.value.attempts[1].improved, false);
  });

  it("accepts a variant that improves the target dimension and passes hard validation", async () => {
    const request = createSoftQualityRepairRequest(baseRequest());
    if (!request.ok) throw new Error(`Expected valid request: ${request.error.message}`);

    // The repair executor should accept an improving variant
    // This test will fail until executeConstrainedRepair is implemented
    const { executeConstrainedRepair } = await import("./index.js");
    const result = await executeConstrainedRepair({
      request: request.value,
      candidate: {
        id: "candidate-001",
        verses: {
          V1: "Mi vecino el gato siempre está",
          V2: "comiendo sin parar su melón",
          V3: "se distrae con hambre repentina",
          V4: "y confiesa que olió el jamón",
        },
      },
      variantGenerator: async () => [{
        verses: {
          V1: "Mi vecino el gato siempre está",
          V2: "comiendo sin parar su melón",
          V3: "el gato se distrae con hambre", // improved naturalness
          V4: "y confiesa que olió el jamón",
        },
      }],
      hardValidator: async () => ({ ok: true }),
      dimensionEvaluator: async () => ({ note: 20, confidence: 0.95 }), // improvement
    });

    assert.equal(result.ok, true);
    if (!result.ok) throw new Error(`Expected repair to succeed: ${result.error.message}`);
    assert.equal(result.value.outcome, "VARIANT_ACCEPTED");
    assert.equal(result.value.acceptedVariant?.verses.V3, "el gato se distrae con hambre");
    assert.equal(result.value.acceptedVariant?.dimensionNote, 20);
  });
});

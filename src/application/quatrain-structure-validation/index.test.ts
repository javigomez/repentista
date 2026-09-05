import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createQuatrainCandidate,
  transitionQuatrainCandidate,
} from "../../domain/quatrain-candidate/index.js";
import {
  QUATRAIN_STRUCTURE_VALIDATOR_NAME,
  QUATRAIN_STRUCTURE_VALIDATOR_VERSION,
  applyQuatrainStructureValidation,
} from "./index.js";
import type { QuatrainStructureValidationResult } from "../../validators/quatrain-structure/index.js";

const CREATED_AT = "2026-08-30T09:15:00.000Z";
const VALIDATION_REQUESTED_AT = "2026-08-30T09:16:00.000Z";
const VALIDATED_AT = "2026-08-30T09:17:00.000Z";

function readyCandidate() {
  const created = createQuatrainCandidate({
    id: "candidate-001",
    batchId: "batch-001",
    brief: {
      context: "Un gato promete compartir la merienda",
      tone: "absurdo y cercano",
      candidateCount: 5,
      topK: 3,
      minimumScore: 80,
      scheme: "0-A-0-A",
      rhyme: "consonant",
      metricPositions: 7,
      verseRetryBudget: 3,
      llmCallBudget: 200,
    },
    plan: {
      rhymeScheme: "0-A-0-A",
      metricPositions: 7,
      slots: [
        {
          slot: "V1",
          role: "PRESENTACION",
          semanticAnchor: "presenta al gato",
          plannedFinalWord: "vecino",
        },
        {
          slot: "V2",
          role: "PREPARACION",
          semanticAnchor: "promete guardar pan",
          plannedFinalWord: "melón",
        },
        {
          slot: "V3",
          role: "GIRO_TENSION",
          semanticAnchor: "se distrae con hambre",
          plannedFinalWord: "camino",
        },
        {
          slot: "V4",
          role: "REMATE",
          semanticAnchor: "comparte solo el olor",
          plannedFinalWord: "jamón",
        },
      ],
    },
    provenance: {
      createdAt: CREATED_AT,
      generator: { name: "QuatrainGenerator", version: "0.1.0" },
      prompt: { id: "writer-from-punchline", version: "prompt-0.1.0" },
      model: { provider: "openai", name: "gpt-5", version: "2026-08-30" },
    },
  });
  assert.equal(created.ok, true);
  if (!created.ok) throw new Error("Expected valid candidate fixture");

  const requested = transitionQuatrainCandidate(created.value, {
    type: "VALIDATION_REQUESTED",
    at: VALIDATION_REQUESTED_AT,
    validators: [
      {
        name: QUATRAIN_STRUCTURE_VALIDATOR_NAME,
        version: QUATRAIN_STRUCTURE_VALIDATOR_VERSION,
      },
    ],
  });
  assert.equal(requested.ok, true);
  if (!requested.ok) throw new Error("Expected validation request to succeed");

  return requested.value;
}

function validResult(): QuatrainStructureValidationResult {
  return {
    verdict: "VALIDO",
    checks: [
      "FOUR_VERSES",
      "NON_EMPTY_TEXT",
      "ORDERED_ROLES",
      "FIXED_RHYME_SCHEME",
      "PLANNED_FINAL_WORDS",
    ],
    violations: [],
  };
}

function invalidResult(): QuatrainStructureValidationResult {
  return {
    verdict: "INVALIDO",
    checks: [
      "FOUR_VERSES",
      "NON_EMPTY_TEXT",
      "ORDERED_ROLES",
      "FIXED_RHYME_SCHEME",
      "PLANNED_FINAL_WORDS",
    ],
    violations: [
      {
        code: "PLANNED_FINAL_WORD_MISMATCH",
        path: "verses[3].text",
        message:
          "El verso V4 debe terminar con «jamón», pero termina con «chorizo».",
      },
    ],
  };
}

describe("quatrain structure validation integration", () => {
  describe("VALIDO unlocks hard validation", () => {
    it("transitions to VALIDO when structure is valid", () => {
      const result = applyQuatrainStructureValidation({
        candidate: readyCandidate(),
        validationResult: validResult(),
        at: VALIDATED_AT,
      });

      assert.equal(result.ok, true);
      if (!result.ok) return;

      assert.equal(result.value.state, "VALIDO");
      assert.equal(result.value.validationCompletion?.diagnostics.length, 1);
      assert.deepEqual(result.value.validationCompletion?.diagnostics[0], {
        validator: QUATRAIN_STRUCTURE_VALIDATOR_NAME,
        version: QUATRAIN_STRUCTURE_VALIDATOR_VERSION,
        result: "VALIDO",
        evidence: {
          pointer: `${QUATRAIN_STRUCTURE_VALIDATOR_NAME}:${QUATRAIN_STRUCTURE_VALIDATOR_VERSION}`,
          summary: "Estructura de cuarteta válida.",
        },
      });
    });
  });

  describe("INVALIDO blocks advancement", () => {
    it("transitions to RECHAZADO when structure is invalid", () => {
      const result = applyQuatrainStructureValidation({
        candidate: readyCandidate(),
        validationResult: invalidResult(),
        at: VALIDATED_AT,
      });

      assert.equal(result.ok, true);
      if (!result.ok) return;

      assert.equal(result.value.state, "RECHAZADO");
      assert.equal(result.value.rejections.length, 1);

      const rejection = result.value.rejections[0];
      assert.equal(rejection.validator, QUATRAIN_STRUCTURE_VALIDATOR_NAME);
      assert.equal(rejection.version, QUATRAIN_STRUCTURE_VALIDATOR_VERSION);
      assert.match(rejection.reason, /PLANNED_FINAL_WORD_MISMATCH/u);
      assert.equal(
        rejection.evidence.pointer,
        `${QUATRAIN_STRUCTURE_VALIDATOR_NAME}:verses[3].text`,
      );
    });

    it("rejects when candidate is not in VALIDACION_PENDIENTE state", () => {
      const created = createQuatrainCandidate({
        id: "candidate-002",
        batchId: "batch-001",
        brief: {
          context: "Un gato promete compartir la merienda",
          tone: "absurdo y cercano",
          candidateCount: 5,
          topK: 3,
          minimumScore: 80,
          scheme: "0-A-0-A",
          rhyme: "consonant",
          metricPositions: 7,
          verseRetryBudget: 3,
          llmCallBudget: 200,
        },
        plan: {
          rhymeScheme: "0-A-0-A",
          metricPositions: 7,
          slots: [
            {
              slot: "V1",
              role: "PRESENTACION",
              semanticAnchor: "presenta al gato",
              plannedFinalWord: "vecino",
            },
            {
              slot: "V2",
              role: "PREPARACION",
              semanticAnchor: "promete guardar pan",
              plannedFinalWord: "melón",
            },
            {
              slot: "V3",
              role: "GIRO_TENSION",
              semanticAnchor: "se distrae con hambre",
              plannedFinalWord: "camino",
            },
            {
              slot: "V4",
              role: "REMATE",
              semanticAnchor: "comparte solo el olor",
              plannedFinalWord: "jamón",
            },
          ],
        },
        provenance: {
          createdAt: CREATED_AT,
          generator: { name: "QuatrainGenerator", version: "0.1.0" },
          prompt: { id: "writer-from-punchline", version: "prompt-0.1.0" },
          model: { provider: "openai", name: "gpt-5", version: "2026-08-30" },
        },
      });
      assert.equal(created.ok, true);
      if (!created.ok) throw new Error("Expected valid candidate fixture");

      const result = applyQuatrainStructureValidation({
        candidate: created.value,
        validationResult: validResult(),
        at: VALIDATED_AT,
      });

      assert.equal(result.ok, false);
      if (result.ok) return;

      assert.equal(result.error.code, "INVALID_TRANSITION");
      assert.equal(result.error.currentState, "GENERADO");
    });
  });
});

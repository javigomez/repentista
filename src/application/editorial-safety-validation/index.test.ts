import test from "node:test";
import assert from "node:assert/strict";

import { createGenerationBrief } from "../../domain/generation-brief/index.js";
import {
  createQuatrainCandidate,
  transitionQuatrainCandidate,
  type CandidatePlanInput,
  type QuatrainCandidate,
} from "../../domain/quatrain-candidate/index.js";
import { createInitialEditorialSafetyPolicy } from "../../content/editorial-safety-policy/index.js";
import {
  createEditorialSafetyValidator,
  type EditorialSafetyValidator,
} from "../../validators/editorial-safety/index.js";
import {
  EDITORIAL_SAFETY_VALIDATOR_NAME,
  validateCandidateEditorialSafety,
} from "./index.js";

const POLICY_VERSION = "editorial-safety-policy/v1";
const VALIDATION_REQUESTED_AT = "2026-08-30T09:16:00.000Z";
const VALIDATED_AT = "2026-08-30T09:17:00.000Z";

const validator: EditorialSafetyValidator = createEditorialSafetyValidator(
  createInitialEditorialSafetyPolicy(),
);

function planWithAnchors(
  anchors: readonly [string, string, string, string],
): CandidatePlanInput {
  return {
    rhymeScheme: "0-A-0-A",
    metricPositions: 7,
    slots: [
      { slot: "V1", role: "PRESENTACION", semanticAnchor: anchors[0], plannedFinalWord: "vecino" },
      { slot: "V2", role: "PREPARACION", semanticAnchor: anchors[1], plannedFinalWord: "melón" },
      { slot: "V3", role: "GIRO_TENSION", semanticAnchor: anchors[2], plannedFinalWord: "camino" },
      { slot: "V4", role: "REMATE", semanticAnchor: anchors[3], plannedFinalWord: "jamón" },
    ],
  };
}

function readyCandidate(
  context: string,
  anchors: readonly [string, string, string, string] = [
    "presenta al gato",
    "promete guardar pan",
    "se distrae con hambre",
    "comparte solo el olor",
  ],
): QuatrainCandidate {
  const brief = createGenerationBrief({ context, tone: "absurdo y cercano" });
  assert.equal(brief.ok, true);
  if (!brief.ok) {
    throw new Error("Expected valid brief fixture");
  }

  const created = createQuatrainCandidate({
    id: "candidate-001",
    batchId: "batch-001",
    brief: brief.value,
    plan: planWithAnchors(anchors),
    provenance: {
      createdAt: "2026-08-30T09:15:00.000Z",
      generator: { name: "QuatrainGenerator", version: "0.1.0" },
      prompt: { id: "writer-from-punchline", version: "prompt-0.1.0" },
      model: { provider: "openai", name: "gpt-5", version: "2026-08-30" },
    },
  });
  assert.equal(created.ok, true);
  if (!created.ok) {
    throw new Error("Expected valid candidate fixture");
  }

  const requested = transitionQuatrainCandidate(created.value, {
    type: "VALIDATION_REQUESTED",
    at: VALIDATION_REQUESTED_AT,
    validators: [{ name: EDITORIAL_SAFETY_VALIDATOR_NAME, version: POLICY_VERSION }],
  });
  assert.equal(requested.ok, true);
  if (!requested.ok) {
    throw new Error("Expected validation request to succeed");
  }

  return requested.value;
}

test("passes a clean candidate and records the policy version in the diagnostic", () => {
  const result = validateCandidateEditorialSafety({
    candidate: readyCandidate("Un gato promete compartir la merienda"),
    validator,
    at: VALIDATED_AT,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.state, "VALIDO");
  assert.equal(result.value.validationCompletion?.diagnostics.length, 1);
  assert.deepEqual(result.value.validationCompletion?.diagnostics[0], {
    validator: EDITORIAL_SAFETY_VALIDATOR_NAME,
    version: POLICY_VERSION,
    result: "VALIDO",
    evidence: { pointer: `${EDITORIAL_SAFETY_VALIDATOR_NAME}:${POLICY_VERSION}` },
  });
});

test("rejects an unambiguous blocking match and records the policy version", () => {
  const result = validateCandidateEditorialSafety({
    candidate: readyCandidate("Un gato promete compartir la merienda", [
      "presenta al gato",
      "dice maricón a un compañero",
      "se distrae con hambre",
      "comparte solo el olor",
    ]),
    validator,
    at: VALIDATED_AT,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.state, "RECHAZADO");
  assert.equal(result.value.rejections.length, 1);

  const rejection = result.value.rejections[0];
  assert.equal(rejection.validator, EDITORIAL_SAFETY_VALIDATOR_NAME);
  assert.equal(rejection.version, POLICY_VERSION);
  assert.match(rejection.reason, /discriminacion/u);
  assert.equal(rejection.evidence.pointer, `${EDITORIAL_SAFETY_VALIDATOR_NAME}:discriminacion:anchor:V2`);
  assert.equal(rejection.evidence.excerpt, "maricón");
});

test("blocks a doubtful match so it does not advance automatically", () => {
  const result = validateCandidateEditorialSafety({
    candidate: readyCandidate("Un gato promete compartir la merienda", [
      "presenta al gato",
      "promete guardar pan",
      "juega con una pistola de agua",
      "comparte solo el olor",
    ]),
    validator,
    at: VALIDATED_AT,
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;

  assert.equal(result.value.state, "RECHAZADO");
  assert.equal(result.value.rejections.length, 1);

  const rejection = result.value.rejections[0];
  assert.equal(rejection.version, POLICY_VERSION);
  assert.match(rejection.reason, /DUDOSO/u);
  assert.match(rejection.reason, /armas-contextuales/u);
  assert.equal(rejection.evidence.excerpt, "pistola");
});

import {
  transitionQuatrainCandidate,
  type CandidateLifecycleTransitionInput,
  type CandidateLifecycleTransitionResult,
  type EvidenceReference,
  type QuatrainCandidate,
  type ValidatorDiagnosticInput,
} from "../../domain/quatrain-candidate/index.js";
import {
  type QuatrainStructureValidationResult,
  type QuatrainStructureInput,
} from "../../validators/quatrain-structure/index.js";

export const QUATRAIN_STRUCTURE_VALIDATOR_NAME = "quatrain-structure" as const;
export const QUATRAIN_STRUCTURE_VALIDATOR_VERSION =
  "quatrain-structure/v1" as const;

const toEvidence = (
  result: QuatrainStructureValidationResult,
): EvidenceReference => {
  const firstViolation = result.violations[0];

  if (firstViolation === undefined) {
    return Object.freeze({
      pointer: `${QUATRAIN_STRUCTURE_VALIDATOR_NAME}:${QUATRAIN_STRUCTURE_VALIDATOR_VERSION}`,
      summary: "Estructura de cuarteta válida.",
    });
  }

  return Object.freeze({
    pointer: `${QUATRAIN_STRUCTURE_VALIDATOR_NAME}:${firstViolation.path}`,
    summary: firstViolation.message,
    excerpt: firstViolation.code,
  });
};

const toDiagnostic = (
  result: QuatrainStructureValidationResult,
): ValidatorDiagnosticInput =>
  Object.freeze({
    validator: QUATRAIN_STRUCTURE_VALIDATOR_NAME,
    version: QUATRAIN_STRUCTURE_VALIDATOR_VERSION,
    result: result.verdict,
    evidence: toEvidence(result),
  });

const toRejectionReason = (
  result: QuatrainStructureValidationResult,
): string => {
  const codes = result.violations.map((v) => v.code).join(", ");
  return `Estructura de cuarteta inválida: ${codes}.`;
};

const toTransition = (
  result: QuatrainStructureValidationResult,
  at: string,
): CandidateLifecycleTransitionInput => {
  if (result.verdict === "VALIDO") {
    return Object.freeze({
      type: "HARD_VALIDATION_PASSED" as const,
      at,
      diagnostics: Object.freeze([toDiagnostic(result)]),
    });
  }

  return Object.freeze({
    type: "HARD_VALIDATION_REJECTED" as const,
    at,
    rejection: Object.freeze({
      validator: QUATRAIN_STRUCTURE_VALIDATOR_NAME,
      version: QUATRAIN_STRUCTURE_VALIDATOR_VERSION,
      reason: toRejectionReason(result),
      evidence: toEvidence(result),
    }),
  });
};

export interface QuatrainStructureValidationRequest {
  readonly candidate: QuatrainCandidate;
  readonly validationResult: QuatrainStructureValidationResult;
  readonly at: string;
}

export function applyQuatrainStructureValidation(
  request: QuatrainStructureValidationRequest,
): CandidateLifecycleTransitionResult {
  return transitionQuatrainCandidate(
    request.candidate,
    toTransition(request.validationResult, request.at),
  );
}

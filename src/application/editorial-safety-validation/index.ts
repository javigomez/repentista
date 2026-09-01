import {
  transitionQuatrainCandidate,
  type CandidateLifecycleTransitionInput,
  type CandidateLifecycleTransitionResult,
  type EvidenceReference,
  type QuatrainCandidate,
  type ValidatorDiagnosticInput,
} from "../../domain/quatrain-candidate/index.js";
import {
  EDITORIAL_SAFETY_VALIDATOR_NAME,
  type EditorialSafetyDiagnostic,
  type EditorialSafetyMatch,
  type EditorialSafetySegment,
  type EditorialSafetyValidator,
} from "../../validators/editorial-safety/index.js";

export { EDITORIAL_SAFETY_VALIDATOR_NAME };

const toSegments = (candidate: QuatrainCandidate): readonly EditorialSafetySegment[] => {
  const segments: EditorialSafetySegment[] = [];
  const contextText = [candidate.brief.context, candidate.brief.tone]
    .filter((part) => part.trim().length > 0)
    .join(" ");

  if (contextText.length > 0) {
    segments.push(Object.freeze({ location: Object.freeze({ kind: "context" as const }), text: contextText }));
  }

  for (const slot of candidate.plan.slots) {
    if (slot.semanticAnchor.trim().length > 0) {
      segments.push(
        Object.freeze({
          location: Object.freeze({ kind: "anchor" as const, slot: slot.slot }),
          text: slot.semanticAnchor,
        }),
      );
    }

    if (slot.plannedFinalWord.trim().length > 0) {
      segments.push(
        Object.freeze({
          location: Object.freeze({ kind: "verse" as const, slot: slot.slot }),
          text: slot.plannedFinalWord,
        }),
      );
    }
  }

  return Object.freeze(segments);
};

const locationPointer = (match: EditorialSafetyMatch): string =>
  [
    EDITORIAL_SAFETY_VALIDATOR_NAME,
    match.ruleId,
    match.location.kind,
    match.location.slot,
  ]
    .filter((part): part is string => part !== undefined && part.length > 0)
    .join(":");

const toEvidence = (diagnostic: EditorialSafetyDiagnostic): EvidenceReference => {
  const firstMatch = diagnostic.matches[0];

  if (firstMatch === undefined) {
    return Object.freeze({
      pointer: `${EDITORIAL_SAFETY_VALIDATOR_NAME}:${diagnostic.policyVersion}`,
    });
  }

  return Object.freeze({
    pointer: locationPointer(firstMatch),
    summary: `La regla '${firstMatch.ruleId}' (${firstMatch.severity}) coincidió en la categoría ${firstMatch.category}.`,
    excerpt: firstMatch.fragment,
  });
};

const toDiagnostic = (diagnostic: EditorialSafetyDiagnostic): ValidatorDiagnosticInput =>
  Object.freeze({
    validator: EDITORIAL_SAFETY_VALIDATOR_NAME,
    version: diagnostic.policyVersion,
    result: diagnostic.verdict,
    evidence: toEvidence(diagnostic),
  });

const toRejectionReason = (diagnostic: EditorialSafetyDiagnostic): string => {
  const firstMatch = diagnostic.matches[0];

  if (firstMatch === undefined) {
    return "El validador de seguridad editorial bloqueó el candidato.";
  }

  if (diagnostic.verdict === "DUDOSO") {
    return `DUDOSO: la regla '${firstMatch.ruleId}' (${firstMatch.category}) requiere revisión editorial.`;
  }

  return `Bloqueado por la regla editorial '${firstMatch.ruleId}' (${firstMatch.category}).`;
};

const toTransition = (
  diagnostic: EditorialSafetyDiagnostic,
  at: string,
): CandidateLifecycleTransitionInput => {
  if (diagnostic.verdict === "VALIDO") {
    return Object.freeze({
      type: "HARD_VALIDATION_PASSED" as const,
      at,
      diagnostics: Object.freeze([toDiagnostic(diagnostic)]),
    });
  }

  return Object.freeze({
    type: "HARD_VALIDATION_REJECTED" as const,
    at,
    rejection: Object.freeze({
      validator: EDITORIAL_SAFETY_VALIDATOR_NAME,
      version: diagnostic.policyVersion,
      reason: toRejectionReason(diagnostic),
      evidence: toEvidence(diagnostic),
    }),
  });
};

export interface EditorialSafetyValidationRequest {
  readonly candidate: QuatrainCandidate;
  readonly validator: EditorialSafetyValidator;
  readonly at: string;
}

export function validateCandidateEditorialSafety(
  request: EditorialSafetyValidationRequest,
): CandidateLifecycleTransitionResult {
  const diagnostic = request.validator.validate({
    segments: toSegments(request.candidate),
  });

  return transitionQuatrainCandidate(
    request.candidate,
    toTransition(diagnostic, request.at),
  );
}

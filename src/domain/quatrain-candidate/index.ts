import type { GenerationBrief } from "../generation-brief/index.js";

export const CANDIDATE_STATES = Object.freeze([
  "GENERADO",
  "VALIDACION_PENDIENTE",
  "RECHAZADO",
  "VALIDO",
  "PUNTUADO",
  "BAJO_UMBRAL",
  "SELECCIONADO",
  "APROBADO",
  "RECHAZADO_EDITORIAL",
  "EXPORTADO",
] as const);

export type QuatrainCandidateState = (typeof CANDIDATE_STATES)[number];

export const VERSE_SLOT_CONTRACT = Object.freeze([
  Object.freeze({ slot: "V1", role: "PRESENTACION" }),
  Object.freeze({ slot: "V2", role: "PREPARACION" }),
  Object.freeze({ slot: "V3", role: "GIRO_TENSION" }),
  Object.freeze({ slot: "V4", role: "REMATE" }),
] as const);

export type VerseSlot = (typeof VERSE_SLOT_CONTRACT)[number]["slot"];
export type VerseRole = (typeof VERSE_SLOT_CONTRACT)[number]["role"];
export type ValidationVerdict = "VALIDO" | "DUDOSO" | "INVALIDO";

export interface ComponentVersion {
  readonly name: string;
  readonly version: string;
}

export interface PromptReference {
  readonly id: string;
  readonly version: string;
}

export interface ModelReference {
  readonly provider: string;
  readonly name: string;
  readonly version: string;
}

export interface CandidateProvenanceInput {
  readonly createdAt: string;
  readonly generator: ComponentVersion;
  readonly prompt: PromptReference;
  readonly model: ModelReference;
}

export interface CandidateVersePlanInput {
  readonly slot: VerseSlot;
  readonly role: VerseRole;
  readonly semanticAnchor: string;
  readonly plannedFinalWord: string;
}

export type CoherenceAssessmentRecordResult =
  | { readonly ok: true; readonly value: QuatrainCandidate }
  | { readonly ok: false; readonly error: CoherenceAssessmentError };

export interface CandidatePlanInput {
  readonly rhymeScheme: string;
  readonly metricPositions: number;
  readonly slots: readonly CandidateVersePlanInput[];
}

export interface QuatrainCandidateInput {
  readonly id: string;
  readonly batchId: string;
  readonly brief: GenerationBrief;
  readonly plan: CandidatePlanInput;
  readonly provenance: CandidateProvenanceInput;
}

export interface CandidateProvenanceTemplateInput {
  readonly generator: ComponentVersion;
  readonly prompt: PromptReference;
  readonly model: ModelReference;
}

export interface QuatrainCandidateFactoryInput {
  readonly batchId: string;
  readonly brief: GenerationBrief;
  readonly plan: CandidatePlanInput;
  readonly provenance: CandidateProvenanceTemplateInput;
}

export type CandidateIdFactory = () => string;
export type CandidateClock = () => Date;

export interface QuatrainCandidateCollaborators {
  readonly nextCandidateId: CandidateIdFactory;
  readonly now: CandidateClock;
}

export interface EvidenceReference {
  readonly pointer: string;
  readonly summary?: string;
  readonly excerpt?: string;
}

export interface CandidateRejectionInput {
  readonly validator: string;
  readonly version: string;
  readonly reason: string;
  readonly evidence: EvidenceReference;
}

export interface ValidatorDiagnosticInput {
  readonly validator: string;
  readonly version: string;
  readonly result: ValidationVerdict;
  readonly evidence: EvidenceReference;
}

export interface ScoreBreakdownInput {
  readonly dimension: string;
  readonly points: number;
  readonly maximum: number;
}

export interface CandidateRepairChangeInput {
  readonly slot: VerseSlot;
  readonly before: string;
  readonly after: string;
}

export interface CandidateRepairInput {
  readonly at: string;
  readonly repairedBy: string;
  readonly sourceRejectionPointer: string;
  readonly changes: readonly CandidateRepairChangeInput[];
  readonly prompt: PromptReference;
  readonly model: ModelReference;
}

export type CandidateLifecycleTransitionInput =
  | {
      readonly type: "VALIDATION_REQUESTED";
      readonly at: string;
      readonly validators: readonly ComponentVersion[];
    }
  | {
      readonly type: "HARD_VALIDATION_PASSED";
      readonly at: string;
      readonly diagnostics: readonly ValidatorDiagnosticInput[];
    }
  | {
      readonly type: "HARD_VALIDATION_REJECTED";
      readonly at: string;
      readonly rejection: CandidateRejectionInput;
    }
  | {
      readonly type: "SCORE_RECORDED";
      readonly at: string;
      readonly rubricVersion: string;
      readonly score: number;
      readonly breakdown: readonly ScoreBreakdownInput[];
      readonly explanation: string;
    }
  | {
      readonly type: "THRESHOLD_FAILED";
      readonly at: string;
      readonly threshold: number;
      readonly score: number;
      readonly reason: string;
    }
  | {
      readonly type: "FINALIST_SELECTED";
      readonly at: string;
      readonly rank: number;
      readonly selectedBy: string;
    }
  | {
      readonly type: "EDITORIAL_APPROVED";
      readonly at: string;
      readonly editor: string;
      readonly reason: string;
    }
  | {
      readonly type: "EDITORIAL_REJECTED";
      readonly at: string;
      readonly editor: string;
      readonly reason: string;
    }
  | {
      readonly type: "EXPORTED";
      readonly at: string;
      readonly packageId: string;
      readonly contractVersion: string;
    };

export interface CandidateLifecycleEvent {
  readonly type:
    | CandidateLifecycleTransitionInput["type"]
    | "CANDIDATE_CREATED"
    | "REPAIR_RECORDED"
    | "PUNCHLINE_RECORDED"
    | "COHERENCE_RECORDED"
    | "NATURALNESS_RECORDED";
  readonly at: string;
  readonly validators?: readonly ComponentVersion[];
  readonly diagnostics?: readonly ValidatorDiagnosticInput[];
  readonly rejection?: CandidateRejectionInput;
  readonly rubricVersion?: string;
  readonly score?: number;
  readonly breakdown?: readonly ScoreBreakdownInput[];
  readonly explanation?: string;
  readonly threshold?: number;
  readonly reason?: string;
  readonly rank?: number;
  readonly selectedBy?: string;
  readonly editor?: string;
  readonly packageId?: string;
  readonly contractVersion?: string;
  readonly repair?: CandidateRepairInput;
  readonly coherenceAssessment?: CoherenceAssessmentRecord;
  readonly naturalnessAssessment?: NaturalnessAssessmentRecord;
  readonly punchlineAssessment?: PunchlineAssessmentRecord;
}

export interface ValidationRequestRecord {
  readonly at: string;
  readonly validators: readonly ComponentVersion[];
}

export interface ValidationCompletionRecord {
  readonly at: string;
  readonly diagnostics: readonly ValidatorDiagnosticInput[];
}

export interface ScoreRecord {
  readonly at: string;
  readonly rubricVersion: string;
  readonly score: number;
  readonly breakdown: readonly ScoreBreakdownInput[];
  readonly explanation: string;
}

export interface ThresholdRecord {
  readonly at: string;
  readonly threshold: number;
  readonly score: number;
  readonly reason: string;
}

export interface FinalistSelectionRecord {
  readonly at: string;
  readonly rank: number;
  readonly selectedBy: string;
}

export interface EditorialDecisionRecord {
  readonly at: string;
  readonly editor: string;
  readonly reason: string;
  readonly decision: "APROBADO" | "RECHAZADO_EDITORIAL";
}

export interface ExportRecord {
  readonly at: string;
  readonly packageId: string;
  readonly contractVersion: string;
}

export const PUNCHLINE_TWIST_DEGREES = Object.freeze([
  "NINGUNO",
  "LEVE",
  "MODERADO",
  "FUERTE",
] as const);

export type PunchlineTwistDegree = (typeof PUNCHLINE_TWIST_DEGREES)[number];

export const PUNCHLINE_CONTEXT_DEPENDENCIES = Object.freeze([
  "NULA",
  "PARCIAL",
  "TOTAL",
] as const);

export type PunchlineContextDependency = (typeof PUNCHLINE_CONTEXT_DEPENDENCIES)[number];

export interface PunchlineAssessmentModel {
  readonly provider: string;
  readonly name: string;
}

export interface PunchlineAssessmentRecord {
  readonly note: number;
  readonly confidence: number;
  readonly expectation: string;
  readonly expectationEvidence: readonly string[];
  readonly resolution: string;
  readonly resolutionEvidence: string;
  readonly twistDegree: PunchlineTwistDegree;
  readonly contextDependency: PunchlineContextDependency;
  readonly rubricVersion: string;
  readonly prompt: PromptReference;
  readonly model: PunchlineAssessmentModel;
  readonly assessedAt: string;
  readonly providerRequestId: string;
}

export type PunchlineAssessmentError =
  | {
      readonly code: "STATE_NOT_ELIGIBLE";
      readonly message: string;
      readonly currentState: QuatrainCandidateState;
    }
  | {
      readonly code: "INVALID_NOTE";
      readonly message: string;
      readonly note: number;
    }
  | {
      readonly code: "INVALID_CONFIDENCE";
      readonly message: string;
      readonly confidence: number;
    }
  | {
      readonly code: "INVALID_PUNCHLINE_FIELD";
      readonly message: string;
      readonly path: string;
    };

export type PunchlineAssessmentRecordResult =
  | { readonly ok: true; readonly value: QuatrainCandidate }
  | { readonly ok: false; readonly error: PunchlineAssessmentError };

export interface CoherenceTransitionEvidence {
  readonly from: VerseSlot;
  readonly to: VerseSlot;
  readonly relation: string;
  readonly evidence: string;
}

export interface CoherenceAssessmentModel {
  readonly provider: string;
  readonly name: string;
}

export interface CoherenceAssessmentRecord {
  readonly note: number;
  readonly confidence: number;
  readonly transitions: readonly CoherenceTransitionEvidence[];
  readonly rubricVersion: string;
  readonly prompt: PromptReference;
  readonly model: CoherenceAssessmentModel;
  readonly assessedAt: string;
  readonly providerRequestId: string;
}

export type CoherenceAssessmentError =
  | { readonly code: "STATE_NOT_ELIGIBLE"; readonly message: string; readonly currentState: QuatrainCandidateState }
  | { readonly code: "INVALID_NOTE"; readonly message: string; readonly note: number }
  | { readonly code: "INVALID_CONFIDENCE"; readonly message: string; readonly confidence: number }
  | { readonly code: "INVALID_TRANSITION"; readonly message: string; readonly path: string };

export interface NaturalnessObservation {
  readonly slot: VerseSlot;
  readonly fragment: string;
  readonly reason: string;
}

export interface NaturalnessAssessmentModel {
  readonly provider: string;
  readonly name: string;
}

export interface NaturalnessAssessmentRecord {
  readonly note: number;
  readonly confidence: number;
  readonly observations: readonly NaturalnessObservation[];
  readonly rubricVersion: string;
  readonly prompt: PromptReference;
  readonly model: NaturalnessAssessmentModel;
  readonly assessedAt: string;
  readonly providerRequestId: string;
}

export type NaturalnessAssessmentError =
  | {
      readonly code: "STATE_NOT_ELIGIBLE";
      readonly message: string;
      readonly currentState: QuatrainCandidateState;
    }
  | {
      readonly code: "INVALID_NOTE";
      readonly message: string;
      readonly note: number;
    }
  | {
      readonly code: "INVALID_CONFIDENCE";
      readonly message: string;
      readonly confidence: number;
    }
  | {
      readonly code: "INVALID_OBSERVATION";
      readonly message: string;
      readonly path: string;
    };

export type NaturalnessAssessmentRecordResult =
  | { readonly ok: true; readonly value: QuatrainCandidate }
  | { readonly ok: false; readonly error: NaturalnessAssessmentError };

export interface CandidatePlan {
  readonly rhymeScheme: string;
  readonly metricPositions: number;
  readonly slots: readonly CandidateVersePlanInput[];
}

export interface CandidateProvenance {
  readonly createdAt: string;
  readonly generator: ComponentVersion;
  readonly prompt: PromptReference;
  readonly model: ModelReference;
}

export interface QuatrainCandidate {
  readonly id: string;
  readonly batchId: string;
  readonly brief: GenerationBrief;
  readonly plan: CandidatePlan;
  readonly provenance: CandidateProvenance;
  readonly state: QuatrainCandidateState;
  readonly events: readonly CandidateLifecycleEvent[];
  readonly rejections: readonly CandidateRejectionInput[];
  readonly repairs: readonly CandidateRepairInput[];
  readonly validationRequest?: ValidationRequestRecord;
  readonly validationCompletion?: ValidationCompletionRecord;
  readonly score?: ScoreRecord;
  readonly thresholdFailure?: ThresholdRecord;
  readonly finalistSelection?: FinalistSelectionRecord;
  readonly editorialDecision?: EditorialDecisionRecord;
  readonly exportRecord?: ExportRecord;
  readonly coherenceAssessment?: CoherenceAssessmentRecord;
  readonly punchlineAssessment?: PunchlineAssessmentRecord;
  readonly naturalnessAssessment?: NaturalnessAssessmentRecord;
}

export const QUATRAIN_CANDIDATE_SNAPSHOT_VERSION = "quatrain-candidate-snapshot/v1" as const;

export interface QuatrainCandidateSnapshot {
  readonly schemaVersion: typeof QUATRAIN_CANDIDATE_SNAPSHOT_VERSION;
  readonly id: string;
  readonly batchId: string;
  readonly brief: GenerationBrief;
  readonly plan: CandidatePlan;
  readonly provenance: CandidateProvenance;
  readonly state: QuatrainCandidateState;
  readonly events: readonly CandidateLifecycleEvent[];
  readonly rejections: readonly CandidateRejectionInput[];
  readonly repairs: readonly CandidateRepairInput[];
  readonly validationRequest?: ValidationRequestRecord;
  readonly validationCompletion?: ValidationCompletionRecord;
  readonly score?: ScoreRecord;
  readonly thresholdFailure?: ThresholdRecord;
  readonly finalistSelection?: FinalistSelectionRecord;
  readonly editorialDecision?: EditorialDecisionRecord;
  readonly exportRecord?: ExportRecord;
  readonly coherenceAssessment?: CoherenceAssessmentRecord;
  readonly punchlineAssessment?: PunchlineAssessmentRecord;
  readonly naturalnessAssessment?: NaturalnessAssessmentRecord;
}

export type CandidateCreationError =
  | {
      readonly field: "plan.slots";
      readonly code: "INCOMPLETE_VERSE_SLOTS";
      readonly message: string;
      readonly missingSlots: readonly VerseSlot[];
      readonly receivedSlots: readonly VerseSlot[];
    }
  | {
      readonly field: "plan.slots";
      readonly code: "INVALID_VERSE_ROLE";
      readonly message: string;
      readonly slot: VerseSlot;
      readonly expectedRole: VerseRole;
      readonly receivedRole: VerseRole;
    }
  | {
      readonly field: keyof QuatrainCandidateInput | "plan.rhymeScheme" | "plan.metricPositions";
      readonly code: "INVALID_CANDIDATE_FIELD";
      readonly message: string;
    };

export type QuatrainCandidateCreationResult =
  | { readonly ok: true; readonly value: QuatrainCandidate }
  | { readonly ok: false; readonly errors: readonly CandidateCreationError[] };

export interface CandidateTransitionError {
  readonly code: "INVALID_TRANSITION";
  readonly currentState: QuatrainCandidateState;
  readonly requestedTransition: CandidateLifecycleTransitionInput["type"];
  readonly missingPrerequisites: readonly QuatrainCandidateState[];
  readonly message: string;
}

export type CandidateLifecycleTransitionResult =
  | { readonly ok: true; readonly value: QuatrainCandidate }
  | { readonly ok: false; readonly error: CandidateTransitionError };

export type CandidateRepairResult =
  | { readonly ok: true; readonly value: QuatrainCandidate }
  | { readonly ok: false; readonly error: CandidateTransitionError };

const expectedSlots = VERSE_SLOT_CONTRACT.map(({ slot }) => slot);

const roleBySlot: Readonly<Record<VerseSlot, VerseRole>> = Object.freeze({
  V1: "PRESENTACION",
  V2: "PREPARACION",
  V3: "GIRO_TENSION",
  V4: "REMATE",
});

const transitionRules = Object.freeze({
  VALIDATION_REQUESTED: Object.freeze({ from: "GENERADO", to: "VALIDACION_PENDIENTE" }),
  HARD_VALIDATION_PASSED: Object.freeze({ from: "VALIDACION_PENDIENTE", to: "VALIDO" }),
  HARD_VALIDATION_REJECTED: Object.freeze({ from: "VALIDACION_PENDIENTE", to: "RECHAZADO" }),
  SCORE_RECORDED: Object.freeze({ from: "VALIDO", to: "PUNTUADO" }),
  THRESHOLD_FAILED: Object.freeze({ from: "PUNTUADO", to: "BAJO_UMBRAL" }),
  FINALIST_SELECTED: Object.freeze({ from: "PUNTUADO", to: "SELECCIONADO" }),
  EDITORIAL_APPROVED: Object.freeze({ from: "SELECCIONADO", to: "APROBADO" }),
  EDITORIAL_REJECTED: Object.freeze({ from: "SELECCIONADO", to: "RECHAZADO_EDITORIAL" }),
  EXPORTED: Object.freeze({ from: "APROBADO", to: "EXPORTADO" }),
} satisfies Record<
  CandidateLifecycleTransitionInput["type"],
  { readonly from: QuatrainCandidateState; readonly to: QuatrainCandidateState }
>);

const freezeComponentVersion = (component: ComponentVersion): ComponentVersion =>
  Object.freeze({ name: component.name, version: component.version });

const freezePrompt = (prompt: PromptReference): PromptReference =>
  Object.freeze({ id: prompt.id, version: prompt.version });

const freezeModel = (model: ModelReference): ModelReference =>
  Object.freeze({ provider: model.provider, name: model.name, version: model.version });

const freezeEvidence = (evidence: EvidenceReference): EvidenceReference =>
  Object.freeze({
    pointer: evidence.pointer,
    ...(evidence.summary === undefined ? {} : { summary: evidence.summary }),
    ...(evidence.excerpt === undefined ? {} : { excerpt: evidence.excerpt }),
  });

const freezeDiagnostic = (diagnostic: ValidatorDiagnosticInput): ValidatorDiagnosticInput =>
  Object.freeze({
    validator: diagnostic.validator,
    version: diagnostic.version,
    result: diagnostic.result,
    evidence: freezeEvidence(diagnostic.evidence),
  });

const freezeRejection = (rejection: CandidateRejectionInput): CandidateRejectionInput =>
  Object.freeze({
    validator: rejection.validator,
    version: rejection.version,
    reason: rejection.reason,
    evidence: freezeEvidence(rejection.evidence),
  });

const freezeScoreBreakdown = (breakdown: ScoreBreakdownInput): ScoreBreakdownInput =>
  Object.freeze({
    dimension: breakdown.dimension,
    points: breakdown.points,
    maximum: breakdown.maximum,
  });

const freezeRepairChange = (change: CandidateRepairChangeInput): CandidateRepairChangeInput =>
  Object.freeze({
    slot: change.slot,
    before: change.before,
    after: change.after,
  });

const freezeRepair = (repair: CandidateRepairInput): CandidateRepairInput =>
  Object.freeze({
    at: repair.at,
    repairedBy: repair.repairedBy,
    sourceRejectionPointer: repair.sourceRejectionPointer,
    changes: Object.freeze(repair.changes.map(freezeRepairChange)),
    prompt: freezePrompt(repair.prompt),
    model: freezeModel(repair.model),
  });

const freezeValidationRequest = (record: ValidationRequestRecord): ValidationRequestRecord =>
  Object.freeze({
    at: record.at,
    validators: Object.freeze(record.validators.map(freezeComponentVersion)),
  });

const freezeValidationCompletion = (
  record: ValidationCompletionRecord,
): ValidationCompletionRecord =>
  Object.freeze({
    at: record.at,
    diagnostics: Object.freeze(record.diagnostics.map(freezeDiagnostic)),
  });

const freezeScore = (record: ScoreRecord): ScoreRecord =>
  Object.freeze({
    at: record.at,
    rubricVersion: record.rubricVersion,
    score: record.score,
    breakdown: Object.freeze(record.breakdown.map(freezeScoreBreakdown)),
    explanation: record.explanation,
  });

const freezeThreshold = (record: ThresholdRecord): ThresholdRecord =>
  Object.freeze({
    at: record.at,
    threshold: record.threshold,
    score: record.score,
    reason: record.reason,
  });

const freezeFinalistSelection = (record: FinalistSelectionRecord): FinalistSelectionRecord =>
  Object.freeze({
    at: record.at,
    rank: record.rank,
    selectedBy: record.selectedBy,
  });

const freezeEditorialDecision = (record: EditorialDecisionRecord): EditorialDecisionRecord =>
  Object.freeze({
    at: record.at,
    editor: record.editor,
    reason: record.reason,
    decision: record.decision,
  });

const freezeExport = (record: ExportRecord): ExportRecord =>
  Object.freeze({
    at: record.at,
    packageId: record.packageId,
    contractVersion: record.contractVersion,
  });

const freezePunchlineAssessment = (
  assessment: PunchlineAssessmentRecord,
): PunchlineAssessmentRecord =>
  Object.freeze({
    note: assessment.note,
    confidence: assessment.confidence,
    expectation: assessment.expectation,
    expectationEvidence: Object.freeze([...assessment.expectationEvidence]),
    resolution: assessment.resolution,
    resolutionEvidence: assessment.resolutionEvidence,
    twistDegree: assessment.twistDegree,
    contextDependency: assessment.contextDependency,
    rubricVersion: assessment.rubricVersion,
    prompt: freezePrompt(assessment.prompt),
    model: Object.freeze({
      provider: assessment.model.provider,
      name: assessment.model.name,
    }),
    assessedAt: assessment.assessedAt,
    providerRequestId: assessment.providerRequestId,
  });

const freezeCoherenceTransition = (
  transition: CoherenceTransitionEvidence,
): CoherenceTransitionEvidence =>
  Object.freeze({
    from: transition.from,
    to: transition.to,
    relation: transition.relation,
    evidence: transition.evidence,
  });

const freezeCoherenceAssessment = (
  assessment: CoherenceAssessmentRecord,
): CoherenceAssessmentRecord =>
  Object.freeze({
    note: assessment.note,
    confidence: assessment.confidence,
    transitions: Object.freeze(assessment.transitions.map(freezeCoherenceTransition)),
    rubricVersion: assessment.rubricVersion,
    prompt: freezePrompt(assessment.prompt),
    model: Object.freeze({
      provider: assessment.model.provider,
      name: assessment.model.name,
    }),
    assessedAt: assessment.assessedAt,
    providerRequestId: assessment.providerRequestId,
  });

const freezeNaturalnessObservation = (
  observation: NaturalnessObservation,
): NaturalnessObservation =>
  Object.freeze({
    slot: observation.slot,
    fragment: observation.fragment,
    reason: observation.reason,
  });

const freezeNaturalnessAssessment = (
  assessment: NaturalnessAssessmentRecord,
): NaturalnessAssessmentRecord =>
  Object.freeze({
    note: assessment.note,
    confidence: assessment.confidence,
    observations: Object.freeze(assessment.observations.map(freezeNaturalnessObservation)),
    rubricVersion: assessment.rubricVersion,
    prompt: freezePrompt(assessment.prompt),
    model: Object.freeze({
      provider: assessment.model.provider,
      name: assessment.model.name,
    }),
    assessedAt: assessment.assessedAt,
    providerRequestId: assessment.providerRequestId,
  });

const freezeEvent = (event: CandidateLifecycleEvent): CandidateLifecycleEvent =>
  Object.freeze({
    ...event,
    ...(event.validators === undefined
      ? {}
      : { validators: Object.freeze(event.validators.map(freezeComponentVersion)) }),
    ...(event.diagnostics === undefined
      ? {}
      : { diagnostics: Object.freeze(event.diagnostics.map(freezeDiagnostic)) }),
    ...(event.rejection === undefined ? {} : { rejection: freezeRejection(event.rejection) }),
    ...(event.breakdown === undefined
      ? {}
      : { breakdown: Object.freeze(event.breakdown.map(freezeScoreBreakdown)) }),
    ...(event.repair === undefined ? {} : { repair: freezeRepair(event.repair) }),
    ...(event.punchlineAssessment === undefined
      ? {}
      : { punchlineAssessment: freezePunchlineAssessment(event.punchlineAssessment) }),
    ...(event.naturalnessAssessment === undefined
      ? {}
      : { naturalnessAssessment: freezeNaturalnessAssessment(event.naturalnessAssessment) }),
  });

const freezePlanSlot = (slot: CandidateVersePlanInput): CandidateVersePlanInput =>
  Object.freeze({
    slot: slot.slot,
    role: slot.role,
    semanticAnchor: slot.semanticAnchor,
    plannedFinalWord: slot.plannedFinalWord,
  });

const freezePlan = (plan: CandidatePlanInput): CandidatePlan =>
  Object.freeze({
    rhymeScheme: plan.rhymeScheme,
    metricPositions: plan.metricPositions,
    slots: Object.freeze(plan.slots.map(freezePlanSlot)),
  });

const freezeProvenance = (provenance: CandidateProvenanceInput): CandidateProvenance =>
  Object.freeze({
    createdAt: provenance.createdAt,
    generator: freezeComponentVersion(provenance.generator),
    prompt: freezePrompt(provenance.prompt),
    model: freezeModel(provenance.model),
  });

const freezeBrief = (brief: GenerationBrief): GenerationBrief =>
  Object.freeze({
    context: brief.context,
    tone: brief.tone,
    candidateCount: brief.candidateCount,
    topK: brief.topK,
    minimumScore: brief.minimumScore,
    scheme: brief.scheme,
    rhyme: brief.rhyme,
    metricPositions: brief.metricPositions,
  });

const createCandidate = (candidate: QuatrainCandidate): QuatrainCandidate =>
  Object.freeze({
    ...candidate,
    events: Object.freeze(candidate.events.map(freezeEvent)),
    rejections: Object.freeze(candidate.rejections.map(freezeRejection)),
    repairs: Object.freeze(candidate.repairs.map(freezeRepair)),
  });

const missingSlotError = (
  missingSlots: readonly VerseSlot[],
  receivedSlots: readonly VerseSlot[],
): CandidateCreationError =>
  Object.freeze({
    field: "plan.slots",
    code: "INCOMPLETE_VERSE_SLOTS",
    message: `El plan debe contener exactamente los slots ${expectedSlots.join(", ")}.`,
    missingSlots: Object.freeze([...missingSlots]),
    receivedSlots: Object.freeze([...receivedSlots]),
  });

const invalidRoleError = (
  slot: VerseSlot,
  expectedRole: VerseRole,
  receivedRole: VerseRole,
): CandidateCreationError =>
  Object.freeze({
    field: "plan.slots",
    code: "INVALID_VERSE_ROLE",
    message: `El slot ${slot} debe usar el rol ${expectedRole}.`,
    slot,
    expectedRole,
    receivedRole,
  });

const invalidFieldError = (
  field: keyof QuatrainCandidateInput | "plan.rhymeScheme" | "plan.metricPositions",
  message: string,
): CandidateCreationError =>
  Object.freeze({
    field,
    code: "INVALID_CANDIDATE_FIELD",
    message,
  });

const hasMeaningfulText = (value: string): boolean => value.trim().length > 0;

const validateCandidateInput = (input: QuatrainCandidateInput): readonly CandidateCreationError[] => {
  const errors: CandidateCreationError[] = [];
  const receivedSlots = input.plan.slots.map(({ slot }) => slot);
  const receivedSlotSet = new Set(receivedSlots);
  const missingSlots = expectedSlots.filter((slot) => !receivedSlotSet.has(slot));

  if (!hasMeaningfulText(input.id)) {
    errors.push(invalidFieldError("id", "El candidato debe tener identificador."));
  }

  if (!hasMeaningfulText(input.batchId)) {
    errors.push(invalidFieldError("batchId", "El candidato debe pertenecer a un lote."));
  }

  if (input.plan.rhymeScheme !== "0-A-0-A") {
    errors.push(invalidFieldError("plan.rhymeScheme", "Solo se admite el esquema 0-A-0-A."));
  }

  if (input.plan.metricPositions !== 7) {
    errors.push(invalidFieldError("plan.metricPositions", "Solo se admiten siete posiciones métricas."));
  }

  if (
    input.plan.slots.length !== expectedSlots.length ||
    missingSlots.length > 0 ||
    !expectedSlots.every((slot, index) => receivedSlots[index] === slot)
  ) {
    errors.push(missingSlotError(missingSlots, receivedSlots));
  }

  for (const slot of input.plan.slots) {
    const expectedRole = roleBySlot[slot.slot];

    if (expectedRole !== slot.role) {
      errors.push(invalidRoleError(slot.slot, expectedRole, slot.role));
    }
  }

  return Object.freeze(errors);
};

export function createQuatrainCandidate(
  input: QuatrainCandidateInput,
): QuatrainCandidateCreationResult {
  const errors = validateCandidateInput(input);

  if (errors.length > 0) {
    return Object.freeze({ ok: false as const, errors });
  }

  const provenance = freezeProvenance(input.provenance);
  const createdEvent = freezeEvent({
    type: "CANDIDATE_CREATED",
    at: provenance.createdAt,
  });

  const candidate = createCandidate({
    id: input.id,
    batchId: input.batchId,
    brief: input.brief,
    plan: freezePlan(input.plan),
    provenance,
    state: "GENERADO",
    events: Object.freeze([createdEvent]),
    rejections: Object.freeze([]),
    repairs: Object.freeze([]),
  });

  return Object.freeze({ ok: true as const, value: candidate });
}

export function createQuatrainCandidateWithCollaborators(
  input: QuatrainCandidateFactoryInput,
  collaborators: QuatrainCandidateCollaborators,
): QuatrainCandidateCreationResult {
  return createQuatrainCandidate({
    id: collaborators.nextCandidateId(),
    batchId: input.batchId,
    brief: input.brief,
    plan: input.plan,
    provenance: {
      createdAt: collaborators.now().toISOString(),
      generator: input.provenance.generator,
      prompt: input.provenance.prompt,
      model: input.provenance.model,
    },
  });
}

export function toQuatrainCandidateSnapshot(
  candidate: QuatrainCandidate,
): QuatrainCandidateSnapshot {
  return Object.freeze({
    schemaVersion: QUATRAIN_CANDIDATE_SNAPSHOT_VERSION,
    id: candidate.id,
    batchId: candidate.batchId,
    state: candidate.state,
    brief: freezeBrief(candidate.brief),
    plan: freezePlan(candidate.plan),
    provenance: freezeProvenance(candidate.provenance),
    events: Object.freeze(candidate.events.map(freezeEvent)),
    rejections: Object.freeze(candidate.rejections.map(freezeRejection)),
    repairs: Object.freeze(candidate.repairs.map(freezeRepair)),
    ...(candidate.validationRequest === undefined
      ? {}
      : { validationRequest: freezeValidationRequest(candidate.validationRequest) }),
    ...(candidate.validationCompletion === undefined
      ? {}
      : { validationCompletion: freezeValidationCompletion(candidate.validationCompletion) }),
    ...(candidate.score === undefined ? {} : { score: freezeScore(candidate.score) }),
    ...(candidate.thresholdFailure === undefined
      ? {}
      : { thresholdFailure: freezeThreshold(candidate.thresholdFailure) }),
    ...(candidate.finalistSelection === undefined
      ? {}
      : { finalistSelection: freezeFinalistSelection(candidate.finalistSelection) }),
    ...(candidate.editorialDecision === undefined
      ? {}
      : { editorialDecision: freezeEditorialDecision(candidate.editorialDecision) }),
    ...(candidate.exportRecord === undefined ? {} : { exportRecord: freezeExport(candidate.exportRecord) }),
    ...(candidate.punchlineAssessment === undefined
      ? {}
      : { punchlineAssessment: freezePunchlineAssessment(candidate.punchlineAssessment) }),
    ...(candidate.naturalnessAssessment === undefined
      ? {}
      : { naturalnessAssessment: freezeNaturalnessAssessment(candidate.naturalnessAssessment) }),
  });
}

const invalidTransition = (
  candidate: QuatrainCandidate,
  transition: CandidateLifecycleTransitionInput,
): CandidateLifecycleTransitionResult =>
  Object.freeze({
    ok: false as const,
    error: Object.freeze({
      code: "INVALID_TRANSITION" as const,
      currentState: candidate.state,
      requestedTransition: transition.type,
      missingPrerequisites: Object.freeze([transitionRules[transition.type].from]),
      message: `Cannot apply ${transition.type} from ${candidate.state}.`,
    }),
  });

const eventFromTransition = (transition: CandidateLifecycleTransitionInput): CandidateLifecycleEvent => {
  switch (transition.type) {
    case "VALIDATION_REQUESTED":
      return freezeEvent({
        type: transition.type,
        at: transition.at,
        validators: transition.validators,
      });
    case "HARD_VALIDATION_PASSED":
      return freezeEvent({
        type: transition.type,
        at: transition.at,
        diagnostics: transition.diagnostics,
      });
    case "HARD_VALIDATION_REJECTED":
      return freezeEvent({
        type: transition.type,
        at: transition.at,
        rejection: transition.rejection,
      });
    case "SCORE_RECORDED":
      return freezeEvent({
        type: transition.type,
        at: transition.at,
        rubricVersion: transition.rubricVersion,
        score: transition.score,
        breakdown: transition.breakdown,
        explanation: transition.explanation,
      });
    case "THRESHOLD_FAILED":
      return freezeEvent({
        type: transition.type,
        at: transition.at,
        threshold: transition.threshold,
        score: transition.score,
        reason: transition.reason,
      });
    case "FINALIST_SELECTED":
      return freezeEvent({
        type: transition.type,
        at: transition.at,
        rank: transition.rank,
        selectedBy: transition.selectedBy,
      });
    case "EDITORIAL_APPROVED":
    case "EDITORIAL_REJECTED":
      return freezeEvent({
        type: transition.type,
        at: transition.at,
        editor: transition.editor,
        reason: transition.reason,
      });
    case "EXPORTED":
      return freezeEvent({
        type: transition.type,
        at: transition.at,
        packageId: transition.packageId,
        contractVersion: transition.contractVersion,
      });
  }
};

const candidateWith = (
  candidate: QuatrainCandidate,
  patch: Omit<Partial<QuatrainCandidate>, "events" | "rejections" | "repairs"> & {
    readonly state: QuatrainCandidateState;
    readonly events: readonly CandidateLifecycleEvent[];
    readonly rejections?: readonly CandidateRejectionInput[];
    readonly repairs?: readonly CandidateRepairInput[];
  },
): QuatrainCandidate =>
  createCandidate({
    ...candidate,
    ...patch,
    state: patch.state,
    events: patch.events,
    rejections: patch.rejections ?? candidate.rejections,
    repairs: patch.repairs ?? candidate.repairs,
  });

export function transitionQuatrainCandidate(
  candidate: QuatrainCandidate,
  transition: CandidateLifecycleTransitionInput,
): CandidateLifecycleTransitionResult {
  const rule = transitionRules[transition.type];

  if (candidate.state !== rule.from) {
    return invalidTransition(candidate, transition);
  }

  const event = eventFromTransition(transition);
  const events = Object.freeze([...candidate.events, event]);
  const basePatch = { state: rule.to, events };

  switch (transition.type) {
    case "VALIDATION_REQUESTED":
      return Object.freeze({
        ok: true as const,
        value: candidateWith(candidate, {
          ...basePatch,
          validationRequest: freezeValidationRequest(transition),
        }),
      });
    case "HARD_VALIDATION_PASSED":
      return Object.freeze({
        ok: true as const,
        value: candidateWith(candidate, {
          ...basePatch,
          validationCompletion: freezeValidationCompletion(transition),
        }),
      });
    case "HARD_VALIDATION_REJECTED": {
      const rejection = freezeRejection(transition.rejection);

      return Object.freeze({
        ok: true as const,
        value: candidateWith(candidate, {
          ...basePatch,
          rejections: Object.freeze([...candidate.rejections, rejection]),
        }),
      });
    }
    case "SCORE_RECORDED":
      return Object.freeze({
        ok: true as const,
        value: candidateWith(candidate, {
          ...basePatch,
          score: freezeScore(transition),
        }),
      });
    case "THRESHOLD_FAILED":
      return Object.freeze({
        ok: true as const,
        value: candidateWith(candidate, {
          ...basePatch,
          thresholdFailure: freezeThreshold(transition),
        }),
      });
    case "FINALIST_SELECTED":
      return Object.freeze({
        ok: true as const,
        value: candidateWith(candidate, {
          ...basePatch,
          finalistSelection: freezeFinalistSelection(transition),
        }),
      });
    case "EDITORIAL_APPROVED":
      return Object.freeze({
        ok: true as const,
        value: candidateWith(candidate, {
          ...basePatch,
          editorialDecision: freezeEditorialDecision({
            at: transition.at,
            editor: transition.editor,
            reason: transition.reason,
            decision: "APROBADO" as const,
          }),
        }),
      });
    case "EDITORIAL_REJECTED":
      return Object.freeze({
        ok: true as const,
        value: candidateWith(candidate, {
          ...basePatch,
          editorialDecision: freezeEditorialDecision({
            at: transition.at,
            editor: transition.editor,
            reason: transition.reason,
            decision: "RECHAZADO_EDITORIAL" as const,
          }),
        }),
      });
    case "EXPORTED":
      return Object.freeze({
        ok: true as const,
        value: candidateWith(candidate, {
          ...basePatch,
          exportRecord: freezeExport(transition),
        }),
      });
  }
}

export function recordCandidateRepair(
  candidate: QuatrainCandidate,
  repairInput: CandidateRepairInput,
): CandidateRepairResult {
  if (candidate.state !== "RECHAZADO") {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "INVALID_TRANSITION" as const,
        currentState: candidate.state,
        requestedTransition: "HARD_VALIDATION_REJECTED" as const,
        missingPrerequisites: Object.freeze(["RECHAZADO" as const]),
        message: `Cannot record a repair from ${candidate.state}.`,
      }),
    });
  }

  const repair = freezeRepair(repairInput);
  const repairEvent = freezeEvent({
    type: "REPAIR_RECORDED",
    at: repair.at,
    repair,
  });

  return Object.freeze({
    ok: true as const,
    value: candidateWith(candidate, {
      state: candidate.state,
      events: Object.freeze([...candidate.events, repairEvent]),
      repairs: Object.freeze([...candidate.repairs, repair]),
    }),
  });
}

const HARD_VALIDATION_PASSED_STATES: readonly QuatrainCandidateState[] = Object.freeze([
  "VALIDO",
  "PUNTUADO",
  "BAJO_UMBRAL",
  "SELECCIONADO",
  "APROBADO",
  "RECHAZADO_EDITORIAL",
  "EXPORTADO",
]);

export function hasPassedHardValidation(state: QuatrainCandidateState): boolean {
  return HARD_VALIDATION_PASSED_STATES.includes(state);
}

const COHERENCE_NOTE_MINIMUM = 0;
const COHERENCE_NOTE_MAXIMUM = 15;
const COHERENCE_CONFIDENCE_MINIMUM = 0;
const COHERENCE_CONFIDENCE_MAXIMUM = 1;

const COHERENCE_TRANSITION_STEPS: readonly { readonly from: VerseSlot; readonly to: VerseSlot }[] =
  Object.freeze([
    Object.freeze({ from: "V1" as VerseSlot, to: "V2" as VerseSlot }),
    Object.freeze({ from: "V2" as VerseSlot, to: "V3" as VerseSlot }),
    Object.freeze({ from: "V3" as VerseSlot, to: "V4" as VerseSlot }),
  ]);
const NATURALNESS_NOTE_MINIMUM = 0;
const NATURALNESS_NOTE_MAXIMUM = 20;
const NATURALNESS_CONFIDENCE_MINIMUM = 0;
const NATURALNESS_CONFIDENCE_MAXIMUM = 1;

const validateCoherenceTransitions = (
  transitions: readonly CoherenceTransitionEvidence[],
): CoherenceAssessmentError | undefined => {
  if (transitions.length !== COHERENCE_TRANSITION_STEPS.length) {
    return Object.freeze({
      code: "INVALID_TRANSITION" as const,
      message: "La evaluación debe describir exactamente las transiciones V1→V2, V2→V3 y V3→V4.",
      path: "$.transitions",
    });
  }

  for (const [index, transition] of transitions.entries()) {
    const expected = COHERENCE_TRANSITION_STEPS[index];
    const path = `$.transitions[${index}]`;

    if (expected === undefined || transition.from !== expected.from || transition.to !== expected.to) {
      const expectedStep =
        expected === undefined ? "V?" : `${expected.from}→${expected.to}`;

      return Object.freeze({
        code: "INVALID_TRANSITION" as const,
        message: `La transición ${path} debe conectar ${expectedStep}.`,
        path,
      });
    }

    if (transition.relation.trim().length === 0) {
      return Object.freeze({
        code: "INVALID_TRANSITION" as const,
        message: `La transición ${path} debe declarar un tipo de relación.`,
        path,
      });
    }

    if (transition.evidence.trim().length === 0) {
      return Object.freeze({
        code: "INVALID_TRANSITION" as const,
        message: `La transición ${path} debe citar un referente o vínculo observable.`,
        path,
      });
    }
  }

  return undefined;
};

export function recordCoherenceAssessment(
  candidate: QuatrainCandidate,
  assessment: CoherenceAssessmentRecord,
): CoherenceAssessmentRecordResult {
  if (!hasPassedHardValidation(candidate.state)) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "STATE_NOT_ELIGIBLE" as const,
        message: `No se puede adjuntar una evaluación de coherencia a un candidato en estado ${candidate.state}.`,
        currentState: candidate.state,
      }),
    });
  }

  if (
    !Number.isInteger(assessment.note) ||
    assessment.note < COHERENCE_NOTE_MINIMUM ||
    assessment.note > COHERENCE_NOTE_MAXIMUM
  ) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "INVALID_NOTE" as const,
        message: `La nota debe ser un entero entre ${COHERENCE_NOTE_MINIMUM} y ${COHERENCE_NOTE_MAXIMUM}.`,
        note: assessment.note,
      }),
    });
  }

  if (
    !Number.isFinite(assessment.confidence) ||
    assessment.confidence < COHERENCE_CONFIDENCE_MINIMUM ||
    assessment.confidence > COHERENCE_CONFIDENCE_MAXIMUM
  ) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "INVALID_CONFIDENCE" as const,
        message: `La confianza debe estar entre ${COHERENCE_CONFIDENCE_MINIMUM} y ${COHERENCE_CONFIDENCE_MAXIMUM}.`,
        confidence: assessment.confidence,
      }),
    });
  }

  const transitionError = validateCoherenceTransitions(assessment.transitions);

  if (transitionError !== undefined) {
    return Object.freeze({ ok: false as const, error: transitionError });
  }

  const frozen = freezeCoherenceAssessment(assessment);
  const event = freezeEvent({
    type: "COHERENCE_RECORDED",
    at: assessment.assessedAt,
    coherenceAssessment: frozen,
  });

  return Object.freeze({
    ok: true as const,
    value: candidateWith(candidate, {
      state: candidate.state,
      events: Object.freeze([...candidate.events, event]),
      coherenceAssessment: frozen,
    }),
  });
}

const validateNaturalnessObservations = (
  observations: readonly NaturalnessObservation[],
): NaturalnessAssessmentError | undefined => {
  const seenSlots = new Set<VerseSlot>();

  for (const [index, observation] of observations.entries()) {
    const path = `$.observations[${index}]`;
    if (!expectedSlots.includes(observation.slot)) {
      return Object.freeze({ code: "INVALID_OBSERVATION" as const, message: `La observación ${path} usa un slot no reconocido.`, path });
    }
    if (seenSlots.has(observation.slot)) {
      return Object.freeze({ code: "INVALID_OBSERVATION" as const, message: `La observación ${path} repite el slot ${observation.slot}.`, path });
    }
    if (observation.fragment.trim().length === 0) {
      return Object.freeze({ code: "INVALID_OBSERVATION" as const, message: `La observación ${path} debe citar un fragmento no vacío.`, path });
    }
    if (observation.reason.trim().length === 0) {
      return Object.freeze({ code: "INVALID_OBSERVATION" as const, message: `La observación ${path} debe incluir una razón observable.`, path });
    }
    seenSlots.add(observation.slot);
  }
  return undefined;
};

export function recordNaturalnessAssessment(
  candidate: QuatrainCandidate,
  assessment: NaturalnessAssessmentRecord,
): NaturalnessAssessmentRecordResult {
  if (!hasPassedHardValidation(candidate.state)) {
    return Object.freeze({ ok: false as const, error: Object.freeze({
      code: "STATE_NOT_ELIGIBLE" as const,
      message: `No se puede adjuntar una evaluación de naturalidad a un candidato en estado ${candidate.state}.`,
      currentState: candidate.state,
    }) });
  }
  if (!Number.isInteger(assessment.note) || assessment.note < NATURALNESS_NOTE_MINIMUM || assessment.note > NATURALNESS_NOTE_MAXIMUM) {
    return Object.freeze({ ok: false as const, error: Object.freeze({
      code: "INVALID_NOTE" as const,
      message: `La nota debe ser un entero entre ${NATURALNESS_NOTE_MINIMUM} y ${NATURALNESS_NOTE_MAXIMUM}.`,
      note: assessment.note,
    }) });
  }
  if (!Number.isFinite(assessment.confidence) || assessment.confidence < NATURALNESS_CONFIDENCE_MINIMUM || assessment.confidence > NATURALNESS_CONFIDENCE_MAXIMUM) {
    return Object.freeze({ ok: false as const, error: Object.freeze({
      code: "INVALID_CONFIDENCE" as const,
      message: `La confianza debe estar entre ${NATURALNESS_CONFIDENCE_MINIMUM} y ${NATURALNESS_CONFIDENCE_MAXIMUM}.`,
      confidence: assessment.confidence,
    }) });
  }
  const observationError = validateNaturalnessObservations(assessment.observations);
  if (observationError !== undefined) return Object.freeze({ ok: false as const, error: observationError });
  const frozen = freezeNaturalnessAssessment(assessment);
  const event = freezeEvent({ type: "NATURALNESS_RECORDED", at: assessment.assessedAt, naturalnessAssessment: frozen });
  return Object.freeze({ ok: true as const, value: candidateWith(candidate, {
    state: candidate.state,
    events: Object.freeze([...candidate.events, event]),
    naturalnessAssessment: frozen,
  }) });
}

const PUNCHLINE_NOTE_MINIMUM = 0;
const PUNCHLINE_NOTE_MAXIMUM = 10;
const PUNCHLINE_CONFIDENCE_MINIMUM = 0;
const PUNCHLINE_CONFIDENCE_MAXIMUM = 1;

const PUNCHLINE_TWIST_DEGREE_SET: ReadonlySet<PunchlineTwistDegree> = new Set(
  PUNCHLINE_TWIST_DEGREES,
);

const PUNCHLINE_CONTEXT_DEPENDENCY_SET: ReadonlySet<PunchlineContextDependency> = new Set(
  PUNCHLINE_CONTEXT_DEPENDENCIES,
);

export function recordPunchlineAssessment(
  candidate: QuatrainCandidate,
  assessment: PunchlineAssessmentRecord,
): PunchlineAssessmentRecordResult {
  if (!hasPassedHardValidation(candidate.state)) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "STATE_NOT_ELIGIBLE" as const,
        message: `No se puede adjuntar una evaluación de remate a un candidato en estado ${candidate.state}.`,
        currentState: candidate.state,
      }),
    });
  }

  if (
    !Number.isInteger(assessment.note) ||
    assessment.note < PUNCHLINE_NOTE_MINIMUM ||
    assessment.note > PUNCHLINE_NOTE_MAXIMUM
  ) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "INVALID_NOTE" as const,
        message: `La nota debe ser un entero entre ${PUNCHLINE_NOTE_MINIMUM} y ${PUNCHLINE_NOTE_MAXIMUM}.`,
        note: assessment.note,
      }),
    });
  }

  if (
    !Number.isFinite(assessment.confidence) ||
    assessment.confidence < PUNCHLINE_CONFIDENCE_MINIMUM ||
    assessment.confidence > PUNCHLINE_CONFIDENCE_MAXIMUM
  ) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "INVALID_CONFIDENCE" as const,
        message: `La confianza debe estar entre ${PUNCHLINE_CONFIDENCE_MINIMUM} y ${PUNCHLINE_CONFIDENCE_MAXIMUM}.`,
        confidence: assessment.confidence,
      }),
    });
  }

  if (assessment.expectation.trim().length === 0) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "INVALID_PUNCHLINE_FIELD" as const,
        message: "La evaluación debe resumir la expectativa previa antes de dar nota.",
        path: "$.expectation",
      }),
    });
  }

  if (assessment.resolution.trim().length === 0) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "INVALID_PUNCHLINE_FIELD" as const,
        message: "La evaluación debe resumir la resolución de V4 antes de dar nota.",
        path: "$.resolution",
      }),
    });
  }

  if (
    assessment.expectationEvidence.length === 0 ||
    assessment.expectationEvidence.some((citation) => citation.trim().length === 0)
  ) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "INVALID_PUNCHLINE_FIELD" as const,
        message: "La evaluación debe citar evidencia textual de V1–V3 que justifique la expectativa.",
        path: "$.expectationEvidence",
      }),
    });
  }

  if (assessment.resolutionEvidence.trim().length === 0) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "INVALID_PUNCHLINE_FIELD" as const,
        message: "La evaluación debe citar evidencia textual de V4 que justifique la resolución.",
        path: "$.resolutionEvidence",
      }),
    });
  }

  if (!PUNCHLINE_TWIST_DEGREE_SET.has(assessment.twistDegree)) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "INVALID_PUNCHLINE_FIELD" as const,
        message: `El grado de giro debe ser uno de ${PUNCHLINE_TWIST_DEGREES.join(", ")}.`,
        path: "$.twistDegree",
      }),
    });
  }

  if (!PUNCHLINE_CONTEXT_DEPENDENCY_SET.has(assessment.contextDependency)) {
    return Object.freeze({
      ok: false as const,
      error: Object.freeze({
        code: "INVALID_PUNCHLINE_FIELD" as const,
        message: `La dependencia del contexto debe ser una de ${PUNCHLINE_CONTEXT_DEPENDENCIES.join(", ")}.`,
        path: "$.contextDependency",
      }),
    });
  }

  const frozen = freezePunchlineAssessment(assessment);
  const event = freezeEvent({
    type: "PUNCHLINE_RECORDED",
    at: assessment.assessedAt,
    punchlineAssessment: frozen,
  });

  return Object.freeze({
    ok: true as const,
    value: candidateWith(candidate, {
      state: candidate.state,
      events: Object.freeze([...candidate.events, event]),
      punchlineAssessment: frozen,
    }),
  });
}

import type {
  StructuredLlmErrorCode,
  StructuredLlmGenerationError,
  StructuredLlmGenerationPort,
  StructuredLlmGenerationProvenance,
  StructuredLlmGenerationRequest,
  StructuredLlmGenerationResult,
  StructuredLlmUsage,
} from "../ports/structured-llm-generation/index.js";

export type FixtureStructuredLlmGenerationStep =
  | FixtureStructuredLlmSuccessStep
  | FixtureStructuredLlmErrorStep;

export interface FixtureStructuredLlmStepBase {
  readonly operation: string;
  readonly provider: string;
  readonly model: string;
  readonly providerRequestId: string;
  readonly completedAt: string;
  readonly durationMs: number;
}

export interface FixtureStructuredLlmSuccessStep extends FixtureStructuredLlmStepBase {
  readonly output: unknown;
  readonly usage: FixtureStructuredLlmUsage;
}

export interface FixtureStructuredLlmErrorStep extends FixtureStructuredLlmStepBase {
  readonly error: FixtureStructuredLlmProviderError;
}

export interface FixtureStructuredLlmUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
}

export interface FixtureStructuredLlmProviderError {
  readonly code: Exclude<StructuredLlmErrorCode, "INVALID_STRUCTURED_OUTPUT">;
  readonly message: string;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
}

export class FixtureStructuredLlmGenerator implements StructuredLlmGenerationPort {
  private readonly stepsByOperation = new Map<string, readonly FixtureStructuredLlmGenerationStep[]>();
  private readonly indexesByOperation = new Map<string, number>();

  constructor(steps: readonly FixtureStructuredLlmGenerationStep[]) {
    for (const step of steps) {
      const currentSteps = this.stepsByOperation.get(step.operation) ?? [];
      this.stepsByOperation.set(step.operation, Object.freeze([...currentSteps, step]));
    }
  }

  async generate<TOutput>(
    request: StructuredLlmGenerationRequest<TOutput>,
  ): Promise<StructuredLlmGenerationResult<TOutput>> {
    const step = this.nextStep(request.operation);
    const provenance = createProvenance(step, request);

    if ("error" in step) {
      return {
        ok: false,
        error: createProviderError(step.error, provenance),
      };
    }

    const validationResult = request.outputSchema.validate(step.output);

    if (!validationResult.ok) {
      return {
        ok: false,
        error: {
          code: "INVALID_STRUCTURED_OUTPUT",
          message: `Structured LLM output failed schema validation for ${request.outputSchema.name}@${request.outputSchema.version}.`,
          retryable: false,
          provenance,
          validationIssues: validationResult.issues,
        },
      };
    }

    return {
      ok: true,
      value: {
        data: validationResult.value,
        provenance,
        usage: createUsage(step.usage),
      },
    };
  }

  private nextStep(operation: string): FixtureStructuredLlmGenerationStep {
    const steps = this.stepsByOperation.get(operation) ?? [];
    const index = this.indexesByOperation.get(operation) ?? 0;
    const step = steps[index];

    if (step === undefined) {
      throw new Error(`No structured LLM fixture for operation ${operation} at index ${index}.`);
    }

    this.indexesByOperation.set(operation, index + 1);
    return step;
  }
}

function createProvenance(
  step: FixtureStructuredLlmStepBase,
  request: StructuredLlmGenerationRequest<unknown>,
): StructuredLlmGenerationProvenance {
  return {
    provider: step.provider,
    model: step.model,
    operation: request.operation,
    prompt: {
      id: request.prompt.id,
      version: request.prompt.version,
    },
    requestId: step.providerRequestId,
    completedAt: step.completedAt,
    durationMs: step.durationMs,
  };
}

function createProviderError(
  fixtureError: FixtureStructuredLlmProviderError,
  provenance: StructuredLlmGenerationProvenance,
): StructuredLlmGenerationError {
  const error = {
    code: fixtureError.code,
    message: fixtureError.message,
    retryable: fixtureError.retryable,
    provenance,
  };

  if (fixtureError.retryAfterMs === undefined) {
    return error;
  }

  return {
    ...error,
    retryAfterMs: fixtureError.retryAfterMs,
  };
}

function createUsage(usage: FixtureStructuredLlmUsage): StructuredLlmUsage {
  return {
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.inputTokens + usage.outputTokens,
  };
}

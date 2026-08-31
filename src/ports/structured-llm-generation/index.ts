export type StructuredLlmPromptRole = "system" | "user" | "assistant";

export interface StructuredLlmPromptMessage {
  readonly role: StructuredLlmPromptRole;
  readonly content: string;
}

export interface StructuredLlmPromptRef {
  readonly id: string;
  readonly version: string;
}

export interface StructuredLlmPrompt extends StructuredLlmPromptRef {
  readonly messages: readonly StructuredLlmPromptMessage[];
}

export interface StructuredLlmLimits {
  readonly timeoutMs: number;
  readonly maxOutputTokens: number;
  readonly maxInputTokens?: number;
}

export interface StructuredLlmOutputSchema<TOutput> {
  readonly name: string;
  readonly version: string;
  validate(value: unknown): StructuredLlmSchemaValidationResult<TOutput>;
}

export type StructuredLlmSchemaValidationResult<TOutput> =
  | { readonly ok: true; readonly value: TOutput }
  | {
      readonly ok: false;
      readonly issues: readonly StructuredLlmValidationIssue[];
    };

export interface StructuredLlmValidationIssue {
  readonly path: string;
  readonly message: string;
}

export interface StructuredLlmGenerationRequest<TOutput> {
  readonly operation: string;
  readonly prompt: StructuredLlmPrompt;
  readonly input: unknown;
  readonly outputSchema: StructuredLlmOutputSchema<TOutput>;
  readonly limits: StructuredLlmLimits;
}

export interface StructuredLlmGenerationPort {
  generate<TOutput>(
    request: StructuredLlmGenerationRequest<TOutput>,
    options?: StructuredLlmGenerationOptions,
  ): Promise<StructuredLlmGenerationResult<TOutput>>;
}

export interface StructuredLlmGenerationOptions {
  readonly signal?: AbortSignal;
}

export type StructuredLlmGenerationResult<TOutput> =
  | {
      readonly ok: true;
      readonly value: StructuredLlmGenerationSuccess<TOutput>;
    }
  | {
      readonly ok: false;
      readonly error: StructuredLlmGenerationError;
    };

export interface StructuredLlmGenerationSuccess<TOutput> {
  readonly data: TOutput;
  readonly provenance: StructuredLlmGenerationProvenance;
  readonly usage: StructuredLlmUsage;
}

export interface StructuredLlmGenerationProvenance {
  readonly provider: string;
  readonly model: string;
  readonly operation: string;
  readonly prompt: StructuredLlmPromptRef;
  readonly requestId: string;
  readonly completedAt: string;
  readonly durationMs: number;
}

export interface StructuredLlmUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
}

export type StructuredLlmGenerationError =
  | StructuredLlmInvalidOutputError
  | StructuredLlmProviderError;

export interface StructuredLlmInvalidOutputError
  extends StructuredLlmGenerationErrorBase<"INVALID_STRUCTURED_OUTPUT"> {
  readonly validationIssues: readonly StructuredLlmValidationIssue[];
}

export type StructuredLlmProviderError =
  | StructuredLlmGenerationErrorBase<"TIMEOUT">
  | StructuredLlmGenerationErrorBase<"CANCELLED">
  | StructuredLlmGenerationErrorBase<"AUTHENTICATION_FAILED">
  | StructuredLlmGenerationErrorBase<"RATE_LIMITED">
  | StructuredLlmGenerationErrorBase<"CONTENT_REJECTED">
  | StructuredLlmGenerationErrorBase<"PROVIDER_UNAVAILABLE">;

export interface StructuredLlmGenerationErrorBase<TCode extends StructuredLlmErrorCode> {
  readonly code: TCode;
  readonly message: string;
  readonly retryable: boolean;
  readonly provenance?: StructuredLlmGenerationProvenance;
  readonly retryAfterMs?: number;
}

export type StructuredLlmErrorCode =
  | "INVALID_STRUCTURED_OUTPUT"
  | "TIMEOUT"
  | "CANCELLED"
  | "AUTHENTICATION_FAILED"
  | "RATE_LIMITED"
  | "CONTENT_REJECTED"
  | "PROVIDER_UNAVAILABLE";

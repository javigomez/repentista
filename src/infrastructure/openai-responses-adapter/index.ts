import OpenAI from "openai";
import type {
  StructuredLlmGenerationPort,
  StructuredLlmGenerationRequest,
  StructuredLlmGenerationResult,
  StructuredLlmGenerationOptions,
  StructuredLlmGenerationProvenance,
  StructuredLlmGenerationError,
  StructuredLlmUsage,
} from "../../ports/structured-llm-generation/index.js";

/**
 * Configuration for the OpenAI Responses adapter.
 * All sensitive values come from external configuration; none are hardcoded.
 */
export interface OpenAiResponsesAdapterConfig {
  readonly apiKey: string;
  readonly model: string;
  readonly organization?: string;
  readonly baseUrl?: string;
}

/**
 * Internal client interface for dependency injection.
 * This allows tests to inject a simulated client without touching the real SDK.
 */
export interface OpenAiResponsesClient {
  createResponse(
    params: OpenAiResponseCreateParams,
    options?: { signal?: AbortSignal },
  ): Promise<OpenAiResponseResult>;
}

/**
 * Internal request type that mirrors the SDK shape without importing SDK types.
 * This ensures no SDK types cross the adapter boundary.
 */
export interface OpenAiResponseCreateParams {
  readonly model: string;
  readonly input: string;
  readonly instructions?: string;
  readonly max_output_tokens?: number;
  readonly text?: {
    readonly format?: {
      readonly type: "json_schema";
      readonly name: string;
      readonly schema: Record<string, unknown>;
      readonly strict: boolean;
    };
  };
}

/**
 * Internal response type that mirrors the SDK shape without importing SDK types.
 */
export interface OpenAiResponseResult {
  readonly id: string;
  readonly model: string;
  readonly status: "completed" | "incomplete" | "failed" | "cancelled";
  readonly output_text?: string;
  readonly incomplete_details?: {
    readonly reason: string;
  };
  readonly usage?: {
    readonly input_tokens: number;
    readonly output_tokens: number;
    readonly total_tokens: number;
  };
  readonly error?: {
    readonly type: string;
    readonly code: string;
    readonly message: string;
  };
}

/**
 * Adapter version for provenance tracking.
 */
export const OPENAI_RESPONSES_ADAPTER_VERSION = "0.1.0";

/**
 * Provider identifier for provenance tracking.
 */
export const OPENAI_PROVIDER_ID = "openai";

/**
 * Creates an OpenAI Responses adapter that implements the StructuredLlmGenerationPort.
 *
 * The adapter translates port requests to OpenAI's Responses API with structured
 * outputs, validates results locally, and maps all errors to the port's taxonomy.
 * No SDK types cross the adapter boundary.
 *
 * @param config - Configuration with API key, model, and optional settings
 * @param client - Optional client for dependency injection (defaults to real SDK)
 */
export function createOpenAiResponsesAdapter(
  config: OpenAiResponsesAdapterConfig,
  client?: OpenAiResponsesClient,
): StructuredLlmGenerationPort {
  // Validate configuration before creating the adapter
  if (!config.apiKey || config.apiKey.trim().length === 0) {
    throw new Error(
      "OpenAI API key is required. Provide a valid key in configuration.",
    );
  }

  const resolvedClient = client ?? createDefaultClient(config);

  return {
    async generate<TOutput>(
      request: StructuredLlmGenerationRequest<TOutput>,
      options?: StructuredLlmGenerationOptions,
    ): Promise<StructuredLlmGenerationResult<TOutput>> {
      const startTime = Date.now();

      // Create a combined signal for timeout and user abort
      const timeoutMs = request.limits.timeoutMs;
      const timeoutController = new AbortController();
      let isTimeout = false;
      const timeoutId = setTimeout(() => {
        isTimeout = true;
        timeoutController.abort();
      }, timeoutMs);

      // Combine signals if user provided one
      const combinedSignal = options?.signal
        ? combineSignals(options.signal, timeoutController.signal)
        : timeoutController.signal;

      try {
        // Translate port request to OpenAI format
        const openAiParams = translateRequest(request, config);

        // Make the API call with the combined signal
        const response = await resolvedClient.createResponse(openAiParams, {
          signal: combinedSignal,
        });

        clearTimeout(timeoutId);

        // Map the response to port result
        return mapResponse<TOutput>(response, request, startTime);
      } catch (error: unknown) {
        clearTimeout(timeoutId);

        // Map SDK errors to port errors, distinguishing timeout from user abort
        return mapError<TOutput>(error, request, startTime, isTimeout);
      }
    },
  };
}

/**
 * Creates the default OpenAI client using the SDK.
 */
function createDefaultClient(
  config: OpenAiResponsesAdapterConfig,
): OpenAiResponsesClient {
  const openai = new OpenAI({
    apiKey: config.apiKey,
    organization: config.organization,
    baseURL: config.baseUrl,
  });

  return {
    async createResponse(params, options) {
      const response = await openai.responses.create(
        {
          model: params.model,
          input: params.input,
          instructions: params.instructions,
          max_output_tokens: params.max_output_tokens,
          text: params.text,
        },
        { signal: options?.signal },
      );

      // Extract only the fields we need, ensuring no SDK types leak
      return {
        id: response.id,
        model: response.model,
        status: response.status as OpenAiResponseResult["status"],
        output_text: response.output_text,
        incomplete_details: response.incomplete_details
          ? { reason: response.incomplete_details.reason ?? "unknown" }
          : undefined,
        usage: response.usage
          ? {
              input_tokens: response.usage.input_tokens,
              output_tokens: response.usage.output_tokens,
              total_tokens: response.usage.total_tokens,
            }
          : undefined,
        error: response.error
          ? {
              type: "response_error",
              code: response.error.code ?? "unknown",
              message: response.error.message ?? "Unknown error",
            }
          : undefined,
      };
    },
  };
}

/**
 * Translates a port request to OpenAI Responses API format.
 */
function translateRequest<TOutput>(
  request: StructuredLlmGenerationRequest<TOutput>,
  config: OpenAiResponsesAdapterConfig,
): OpenAiResponseCreateParams {
  // Build the input from prompt messages
  const input = request.prompt.messages
    .map((msg) => `[${msg.role}]: ${msg.content}`)
    .join("\n\n");

  // Build the instructions from system messages
  const instructions = request.prompt.messages
    .filter((msg) => msg.role === "system")
    .map((msg) => msg.content)
    .join("\n");

  // Build the JSON schema format for structured output
  const textFormat = {
    type: "json_schema" as const,
    name: request.outputSchema.name,
    schema: buildJsonSchema(request.outputSchema),
    strict: true,
  };

  return {
    model: config.model,
    input,
    instructions: instructions || undefined,
    max_output_tokens: request.limits.maxOutputTokens,
    text: {
      format: textFormat,
    },
  };
}

/**
 * Builds a JSON Schema object from the output schema.
 * This is a simplified version; real implementation should generate proper JSON Schema.
 */
function buildJsonSchema(schema: {
  name: string;
  version: string;
}): Record<string, unknown> {
  // For now, return a basic schema structure
  // The real implementation should introspect the validate function
  // or use a separate schema definition
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    properties: {
      finalConcept: { type: "string" },
      verses: {
        type: "array",
        items: {
          type: "object",
          properties: {
            slot: { type: "string" },
            role: { type: "string" },
          },
          required: ["slot", "role"],
        },
        minItems: 4,
        maxItems: 4,
      },
    },
    required: ["finalConcept", "verses"],
    additionalProperties: false,
  };
}

/**
 * Maps an OpenAI response to a port result.
 */
function mapResponse<TOutput>(
  response: OpenAiResponseResult,
  request: StructuredLlmGenerationRequest<TOutput>,
  startTime: number,
): StructuredLlmGenerationResult<TOutput> {
  const durationMs = Date.now() - startTime;
  const provenance = createProvenance(response, request, durationMs);

  // Handle incomplete responses
  if (response.status === "incomplete") {
    return {
      ok: false,
      error: mapIncompleteResponse(response, provenance),
    };
  }

  // Handle failed responses
  if (response.status === "failed") {
    return {
      ok: false,
      error: mapFailedResponse(response, provenance),
    };
  }

  // Handle cancelled responses
  if (response.status === "cancelled") {
    return {
      ok: false,
      error: {
        code: "CANCELLED",
        message: "The request was cancelled.",
        retryable: false,
        provenance,
      },
    };
  }

  // Handle completed responses
  if (response.status !== "completed" || !response.output_text) {
    return {
      ok: false,
      error: {
        code: "PROVIDER_UNAVAILABLE",
        message: "Response did not complete successfully.",
        retryable: true,
        provenance,
      },
    };
  }

  // Parse and validate the output
  return parseAndValidateOutput(
    response.output_text,
    request,
    provenance,
    response.usage,
  );
}

/**
 * Maps an incomplete response to a port error.
 */
function mapIncompleteResponse(
  response: OpenAiResponseResult,
  provenance: StructuredLlmGenerationProvenance,
): StructuredLlmGenerationError {
  const reason = response.incomplete_details?.reason ?? "unknown";

  if (reason === "content_filter") {
    return {
      code: "CONTENT_REJECTED",
      message: "The provider refused the request due to content policy.",
      retryable: false,
      provenance,
    };
  }

  // For max_output_tokens and other reasons
  return {
    code: "PROVIDER_UNAVAILABLE",
    message: `Response incomplete: ${reason}`,
    retryable: true,
    provenance,
  };
}

/**
 * Maps a failed response to a port error.
 */
function mapFailedResponse(
  response: OpenAiResponseResult,
  provenance: StructuredLlmGenerationProvenance,
): StructuredLlmGenerationError {
  const errorType = response.error?.type ?? "unknown";

  if (errorType === "authentication_error") {
    return {
      code: "AUTHENTICATION_FAILED",
      message: "The provider rejected authentication.",
      retryable: false,
      provenance,
    };
  }

  if (errorType === "rate_limit_error") {
    return {
      code: "RATE_LIMITED",
      message: "The provider rate limit was exceeded.",
      retryable: true,
      provenance,
    };
  }

  return {
    code: "PROVIDER_UNAVAILABLE",
    message: response.error?.message ?? "The provider returned an error.",
    retryable: true,
    provenance,
  };
}

/**
 * Parses and validates the output against the local schema.
 */
function parseAndValidateOutput<TOutput>(
  outputText: string,
  request: StructuredLlmGenerationRequest<TOutput>,
  provenance: StructuredLlmGenerationProvenance,
  usage: OpenAiResponseResult["usage"],
): StructuredLlmGenerationResult<TOutput> {
  // Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    return {
      ok: false,
      error: {
        code: "INVALID_STRUCTURED_OUTPUT",
        message: "Failed to parse response as JSON.",
        retryable: false,
        provenance,
        validationIssues: [
          { path: "$", message: "Response is not valid JSON." },
        ],
      },
    };
  }

  // Validate against local schema
  const validationResult = request.outputSchema.validate(parsed);

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

  // Success
  return {
    ok: true,
    value: {
      data: validationResult.value,
      provenance,
      usage: createUsage(usage),
    },
  };
}

/**
 * Creates provenance information from the response.
 */
function createProvenance(
  response: OpenAiResponseResult,
  request: StructuredLlmGenerationRequest<unknown>,
  durationMs: number,
): StructuredLlmGenerationProvenance {
  return {
    provider: OPENAI_PROVIDER_ID,
    model: response.model,
    operation: request.operation,
    prompt: {
      id: request.prompt.id,
      version: request.prompt.version,
    },
    requestId: response.id,
    completedAt: new Date().toISOString(),
    durationMs,
  };
}

/**
 * Creates usage information from the response.
 */
function createUsage(usage: OpenAiResponseResult["usage"]): StructuredLlmUsage {
  if (!usage) {
    return {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };
  }

  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.total_tokens,
  };
}

/**
 * Maps SDK errors to port errors.
 * Ensures no secrets leak into error messages.
 */
function mapError<TOutput>(
  error: unknown,
  request: StructuredLlmGenerationRequest<TOutput>,
  startTime: number,
  isTimeout = false,
): StructuredLlmGenerationResult<TOutput> {
  const durationMs = Date.now() - startTime;
  const provenance: StructuredLlmGenerationProvenance = {
    provider: OPENAI_PROVIDER_ID,
    model: "unknown",
    operation: request.operation,
    prompt: {
      id: request.prompt.id,
      version: request.prompt.version,
    },
    requestId: "unknown",
    completedAt: new Date().toISOString(),
    durationMs,
  };

  // Handle abort errors
  if (error instanceof DOMException && error.name === "AbortError") {
    // Distinguish between timeout and user abort
    if (isTimeout) {
      return {
        ok: false,
        error: {
          code: "TIMEOUT",
          message: `Structured LLM operation timed out after ${request.limits.timeoutMs} ms.`,
          retryable: true,
          provenance,
        },
      };
    }

    return {
      ok: false,
      error: {
        code: "CANCELLED",
        message: "The request was cancelled.",
        retryable: false,
        provenance,
      },
    };
  }

  // Handle OpenAI SDK errors
  if (isOpenAiError(error)) {
    return {
      ok: false,
      error: mapOpenAiError(error, provenance),
    };
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      ok: false,
      error: {
        code: "PROVIDER_UNAVAILABLE",
        message: sanitizeErrorMessage(error.message),
        retryable: true,
        provenance,
      },
    };
  }

  // Unknown error
  return {
    ok: false,
    error: {
      code: "PROVIDER_UNAVAILABLE",
      message: "An unknown error occurred.",
      retryable: true,
      provenance,
    },
  };
}

/**
 * Type guard for OpenAI SDK errors.
 */
function isOpenAiError(error: unknown): error is {
  status: number;
  error?: { type?: string; code?: string; message?: string };
  headers?: Record<string, string>;
} {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  );
}

/**
 * Maps OpenAI SDK errors to port errors.
 */
function mapOpenAiError(
  error: {
    status: number;
    error?: { type?: string; code?: string; message?: string };
    headers?: Record<string, string>;
  },
  provenance: StructuredLlmGenerationProvenance,
): StructuredLlmGenerationError {
  const status = error.status;
  const errorType = error.error?.type ?? "unknown";

  // Authentication errors
  if (status === 401 || errorType === "authentication_error") {
    return {
      code: "AUTHENTICATION_FAILED",
      message: "The provider rejected authentication.",
      retryable: false,
      provenance,
    };
  }

  // Rate limit errors
  if (status === 429 || errorType === "rate_limit_error") {
    const retryAfter = error.headers?.["retry-after"];
    const retryAfterMs = retryAfter
      ? parseInt(retryAfter, 10) * 1000
      : undefined;

    return {
      code: "RATE_LIMITED",
      message: "The provider rate limit was exceeded.",
      retryable: true,
      provenance,
      retryAfterMs,
    };
  }

  // Server errors
  if (status >= 500) {
    return {
      code: "PROVIDER_UNAVAILABLE",
      message: "The provider is unavailable.",
      retryable: true,
      provenance,
    };
  }

  // Other errors
  return {
    code: "PROVIDER_UNAVAILABLE",
    message: sanitizeErrorMessage(
      error.error?.message ?? "The provider returned an error.",
    ),
    retryable: true,
    provenance,
  };
}

/**
 * Sanitizes error messages to remove potential secrets.
 */
function sanitizeErrorMessage(message: string): string {
  // Remove potential API key patterns
  return message
    .replace(/sk-[a-zA-Z0-9]+/g, "[REDACTED]")
    .replace(/Bearer\s+[a-zA-Z0-9._-]+/g, "Bearer [REDACTED]");
}

/**
 * Combines multiple abort signals into one.
 * The combined signal aborts when any of the input signals abort.
 */
function combineSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();

  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }

    signal.addEventListener("abort", () => controller.abort(signal.reason), {
      once: true,
    });
  }

  return controller.signal;
}

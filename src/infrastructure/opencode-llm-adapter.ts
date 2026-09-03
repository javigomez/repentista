import type {
  StructuredLlmGenerationPort,
  StructuredLlmGenerationRequest,
  StructuredLlmGenerationResult,
  StructuredLlmGenerationOptions,
  StructuredLlmGenerationProvenance,
  StructuredLlmGenerationSuccess,
  StructuredLlmGenerationError,
  StructuredLlmUsage,
} from "../ports/structured-llm-generation/index.js";

export interface OpenCodeClient {
  readonly session: {
    create(input: {
      readonly location: { readonly directory: string };
    }): Promise<{ readonly id: string }>;
    prompt(input: {
      readonly sessionID: string;
      readonly text: string;
    }): Promise<unknown>;
  };
}

export interface OpenCodeStructuredLlmGeneratorConfig {
  readonly client: OpenCodeClient;
  readonly directory: string;
  readonly model: string;
}

export class OpenCodeStructuredLlmGenerator implements StructuredLlmGenerationPort {
  private readonly client: OpenCodeClient;
  private readonly directory: string;
  private readonly model: string;

  constructor(config: OpenCodeStructuredLlmGeneratorConfig) {
    this.client = config.client;
    this.directory = config.directory;
    this.model = config.model;
  }

  async generate<TOutput>(
    request: StructuredLlmGenerationRequest<TOutput>,
    options?: StructuredLlmGenerationOptions,
  ): Promise<StructuredLlmGenerationResult<TOutput>> {
    const startTime = Date.now();

    try {
      const session = await this.client.session.create({
        location: { directory: this.directory },
      });

      const promptText = this.buildPromptText(request);
      const response = await this.executePrompt(
        session.id,
        promptText,
        request.limits.timeoutMs,
        options?.signal,
      );

      const provenance: StructuredLlmGenerationProvenance = {
        provider: "opencode",
        model: this.model,
        operation: request.operation,
        prompt: {
          id: request.prompt.id,
          version: request.prompt.version,
        },
        requestId: this.extractRequestId(response),
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };

      let parsed: unknown;
      try {
        parsed = this.extractJson(response);
      } catch {
        return {
          ok: false,
          error: {
            code: "INVALID_STRUCTURED_OUTPUT",
            message: "Failed to parse JSON from OpenCode response.",
            retryable: false,
            provenance,
            validationIssues: [
              { path: "$", message: "Response is not valid JSON." },
            ],
          },
        };
      }

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

      const usage = this.extractUsage(response);

      return {
        ok: true,
        value: {
          data: validationResult.value,
          provenance,
          usage,
        },
      };
    } catch (error) {
      return {
        ok: false,
        error: this.mapError(error, startTime, request),
      };
    }
  }

  private buildPromptText(
    request: StructuredLlmGenerationRequest<unknown>,
  ): string {
    return request.prompt.messages.map((m) => m.content).join("\n");
  }

  private async executePrompt(
    sessionId: string,
    text: string,
    timeoutMs: number,
    signal?: AbortSignal,
  ): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs} ms`));
      }, timeoutMs);

      const onAbort = () => {
        clearTimeout(timeout);
        reject(new Error("The operation was aborted"));
      };

      if (signal) {
        if (signal.aborted) {
          clearTimeout(timeout);
          reject(new Error("The operation was aborted"));
          return;
        }
        signal.addEventListener("abort", onAbort, { once: true });
      }

      this.client.session
        .prompt({ sessionID: sessionId, text })
        .then((result) => {
          clearTimeout(timeout);
          if (signal) {
            signal.removeEventListener("abort", onAbort);
          }
          resolve(result);
        })
        .catch((err) => {
          clearTimeout(timeout);
          if (signal) {
            signal.removeEventListener("abort", onAbort);
          }
          reject(err);
        });
    });
  }

  private extractJson(response: unknown): unknown {
    if (typeof response !== "object" || response === null) {
      throw new Error("Response is not an object");
    }

    const resp = response as Record<string, unknown>;
    const parts = resp.parts as Array<Record<string, unknown>> | undefined;

    if (!Array.isArray(parts) || parts.length === 0) {
      throw new Error("Response has no parts");
    }

    const textPart = parts.find((p) => p.type === "text");
    if (!textPart || typeof textPart.text !== "string") {
      throw new Error("Response has no text part");
    }

    try {
      return JSON.parse(textPart.text);
    } catch {
      throw new Error(`Failed to parse JSON from response: ${textPart.text}`);
    }
  }

  private extractRequestId(response: unknown): string {
    if (typeof response !== "object" || response === null) {
      return "unknown";
    }

    const resp = response as Record<string, unknown>;
    const info = resp.info as Record<string, unknown> | undefined;

    if (info && typeof info.id === "string") {
      return info.id;
    }

    return "unknown";
  }

  private extractUsage(response: unknown): StructuredLlmUsage {
    // OpenCode may not provide token usage; return zeros if unavailable
    return {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };
  }

  private mapError(
    error: unknown,
    startTime: number,
    request: StructuredLlmGenerationRequest<unknown>,
  ): StructuredLlmGenerationError {
    const message = error instanceof Error ? error.message : String(error);
    const durationMs = Date.now() - startTime;

    const provenance: StructuredLlmGenerationProvenance = {
      provider: "opencode",
      model: this.model,
      operation: request.operation,
      prompt: {
        id: request.prompt.id,
        version: request.prompt.version,
      },
      requestId: "unknown",
      completedAt: new Date().toISOString(),
      durationMs,
    };

    if (message.includes("aborted")) {
      return {
        code: "CANCELLED",
        message: "Structured LLM operation was cancelled.",
        retryable: false,
        provenance,
      };
    }

    if (message.includes("timed out")) {
      return {
        code: "TIMEOUT",
        message: `Structured LLM operation timed out after ${request.limits.timeoutMs} ms.`,
        retryable: true,
        provenance,
      };
    }

    if (message.includes("ECONNREFUSED") || message.includes("unavailable")) {
      return {
        code: "PROVIDER_UNAVAILABLE",
        message: "The OpenCode server is unavailable.",
        retryable: true,
        provenance,
      };
    }

    if (message.includes("model not found")) {
      return {
        code: "PROVIDER_UNAVAILABLE",
        message: `The requested model is unavailable: ${this.model}`,
        retryable: true,
        provenance,
      };
    }

    return {
      code: "PROVIDER_UNAVAILABLE",
      message: `OpenCode error: ${message}`,
      retryable: true,
      provenance,
    };
  }
}
